import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import Alarm from '../models/Alarm';
import FiberRoute from '../models/FiberRoute';
import RTU from '../models/RTU';
import { emitEvent } from '../utils/websocket';

const OPEN_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const OFFLINE_THRESHOLD_MINUTES = 15;
const TEMPERATURE_WARNING_C = 40;
const TEMPERATURE_CRITICAL_C = 45;
const ATTENUATION_WARNING_DB = 15;
const ATTENUATION_CRITICAL_DB = 18;

type AlarmPayload = {
  rtuId?: number;
  routeId?: number;
  severity: 'critical' | 'major' | 'minor' | 'info';
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  message: string;
  location?: string;
  localizationKm?: string;
  owner?: string;
};

const formatRouteKm = (value?: number | null): string | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return `KM ${value.toFixed(2)}`;
};

export class AlarmDetectionService {
  async detectAlarms(): Promise<void> {
    if (!databaseState.connected) {
      return;
    }

    const [rtus, routes] = await Promise.all([RTU.findAll(), FiberRoute.findAll()]);

    for (const rtu of rtus) {
      await this.detectRtuAlarm(rtu);
    }

    for (const route of routes) {
      await this.detectRouteAlarm(route);
    }
  }

  private async detectRtuAlarm(rtu: RTU): Promise<void> {
    const lastSeen = rtu.lastSeen ? new Date(rtu.lastSeen) : null;
    const minutesSinceLastSeen = lastSeen
      ? (Date.now() - lastSeen.getTime()) / 60000
      : Number.POSITIVE_INFINITY;
    const offlineMinutes = Number.isFinite(minutesSinceLastSeen) ? Math.round(minutesSinceLastSeen) : null;

    if (
      rtu.status === 'offline' ||
      rtu.status === 'unreachable' ||
      minutesSinceLastSeen > OFFLINE_THRESHOLD_MINUTES
    ) {
      await this.createAlarm({
        rtuId: rtu.id,
        severity: 'critical',
        alarmType: 'RTU Down',
        message:
          offlineMinutes !== null
            ? `RTU ${rtu.name} is offline or unreachable (${offlineMinutes} min since last update).`
            : `RTU ${rtu.name} is offline or unreachable (last update unavailable).`,
        location: rtu.locationAddress || rtu.name,
        owner: 'NQMS Rule Engine',
      });
    }

    if (typeof rtu.temperature === 'number') {
      if (rtu.temperature > TEMPERATURE_CRITICAL_C) {
        await this.createAlarm({
          rtuId: rtu.id,
          severity: 'critical',
          alarmType: 'Temperature',
          message: `Temperature critical on ${rtu.name}: ${rtu.temperature} C`,
          location: rtu.locationAddress || rtu.name,
          owner: 'NQMS Rule Engine',
        });
      } else if (rtu.temperature > TEMPERATURE_WARNING_C) {
        await this.createAlarm({
          rtuId: rtu.id,
          severity: 'major',
          alarmType: 'Temperature',
          message: `Temperature high on ${rtu.name}: ${rtu.temperature} C`,
          location: rtu.locationAddress || rtu.name,
          owner: 'NQMS Rule Engine',
        });
      }
    }
  }

  private async detectRouteAlarm(route: FiberRoute): Promise<void> {
    if (route.fiberStatus === 'broken' || route.routeStatus === 'inactive') {
      await this.createAlarm({
        routeId: route.id,
        severity: 'critical',
        alarmType: 'Fiber Cut',
        message: `Fiber cut detected on ${route.routeName} (${route.source} -> ${route.destination}).`,
        location: route.source,
        localizationKm: formatRouteKm(route.lengthKm),
        owner: 'NQMS Rule Engine',
      });
      return;
    }

    if (typeof route.attenuationDb === 'number') {
      if (route.attenuationDb > ATTENUATION_CRITICAL_DB) {
        await this.createAlarm({
          routeId: route.id,
          severity: 'critical',
          alarmType: 'High Loss',
          message: `High loss detected on ${route.routeName}: ${route.attenuationDb.toFixed(1)} dB.`,
          location: route.source,
          localizationKm: formatRouteKm(route.lengthKm),
          owner: 'NQMS Rule Engine',
        });
      } else if (route.attenuationDb > ATTENUATION_WARNING_DB) {
        await this.createAlarm({
          routeId: route.id,
          severity: 'major',
          alarmType: 'High Loss',
          message: `Loss drift detected on ${route.routeName}: ${route.attenuationDb.toFixed(1)} dB.`,
          location: route.source,
          localizationKm: formatRouteKm(route.lengthKm),
          owner: 'NQMS Rule Engine',
        });
      }
    }

    if (route.reflectionEvents && typeof route.attenuationDb === 'number' && route.attenuationDb > ATTENUATION_WARNING_DB) {
      await this.createAlarm({
        routeId: route.id,
        severity: 'minor',
        alarmType: 'High Loss',
        message: `Reflection events observed on ${route.routeName}; verify splice and connector quality.`,
        location: route.source,
        localizationKm: formatRouteKm(route.lengthKm),
        owner: 'NQMS Rule Engine',
      });
    }
  }

  private async createAlarm(alarmData: AlarmPayload): Promise<void> {
    const where: Record<string, unknown> = {
      alarmType: alarmData.alarmType,
      lifecycleStatus: {
        [Op.in]: [...OPEN_LIFECYCLE_STATUSES],
      },
    };

    if (typeof alarmData.rtuId === 'number') {
      where.rtuId = alarmData.rtuId;
    }

    if (typeof alarmData.routeId === 'number') {
      where.routeId = alarmData.routeId;
    }

    const existing = await Alarm.findOne({ where });
    if (existing) {
      return;
    }

    const alarm = await Alarm.create({
      ...alarmData,
      lifecycleStatus: 'active',
      occurredAt: new Date(),
    });

    emitEvent('new_alarm', alarm);
    console.log(`New alarm: ${alarm.message}`);
  }
}
