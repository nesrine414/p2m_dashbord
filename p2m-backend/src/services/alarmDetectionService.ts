import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import Alarm from '../models/Alarm';
import Fibre from '../models/Fibre';
import Measurement from '../models/Measurement';
import RTU from '../models/RTU';
import { emitEvent } from '../utils/websocket';
import { HEARTBEAT_STALE_MINUTES } from '../utils/rtuHealth';

const OPEN_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const TEMPERATURE_WARNING_C = 40;
const TEMPERATURE_CRITICAL_C = 45;
const ATTENUATION_WARNING_DB = 15;
const ATTENUATION_CRITICAL_DB = 18;

type AlarmPayload = {
  rtuId?: number;
  fibreId?: number;
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

    const [rtus, fibres, measurements] = await Promise.all([
      RTU.findAll(),
      Fibre.findAll(),
      Measurement.findAll({ order: [['timestamp', 'DESC']] }),
    ]);

    const latestMeasurementByFibre = new Map<number, Measurement>();
    measurements.forEach((measurement) => {
      const fibreId = measurement.get('fibreId') as number;
      if (!latestMeasurementByFibre.has(fibreId)) {
        latestMeasurementByFibre.set(fibreId, measurement);
      }
    });

    for (const rtu of rtus) {
      await this.detectRtuAlarm(rtu);
    }

    for (const fibre of fibres) {
      await this.detectFibreAlarm(fibre, latestMeasurementByFibre.get(fibre.id));
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
      minutesSinceLastSeen > HEARTBEAT_STALE_MINUTES
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

  private async detectFibreAlarm(fibre: Fibre, measurement?: Measurement): Promise<void> {
    const fibreStatus = fibre.get('status') as string;
    const fibreName = fibre.get('name') as string;
    const rtuId = fibre.get('rtuId') as number;
    const rtu = await RTU.findByPk(rtuId);
    const label = `${rtu?.name || `RTU-${rtuId}`} ${fibreName}`;
    const attenuation = (measurement?.get('attenuation') as number | null) ?? null;
    const testResult = (measurement?.get('testResult') as string | null) ?? null;
    const length = (fibre.get('length') as number | null) ?? null;
    const location = (rtu?.get('locationAddress') as string | null) || rtu?.name || label;

    if (fibreStatus === 'broken') {
      await this.createAlarm({
        rtuId,
        fibreId: fibre.id,
        routeId: fibre.id,
        severity: 'critical',
        alarmType: 'Fiber Cut',
        message: `Fiber cut detected on ${label}.`,
        location,
        localizationKm: formatRouteKm(length),
        owner: 'NQMS Rule Engine',
      });
      return;
    }

    if (typeof attenuation === 'number') {
      if (attenuation > ATTENUATION_CRITICAL_DB) {
        await this.createAlarm({
          rtuId,
          fibreId: fibre.id,
          routeId: fibre.id,
          severity: 'critical',
          alarmType: 'High Loss',
          message: `High loss detected on ${label}: ${attenuation.toFixed(1)} dB.`,
          location,
          localizationKm: formatRouteKm(length),
          owner: 'NQMS Rule Engine',
        });
      } else if (attenuation > ATTENUATION_WARNING_DB) {
        await this.createAlarm({
          rtuId,
          fibreId: fibre.id,
          routeId: fibre.id,
          severity: 'major',
          alarmType: 'High Loss',
          message: `Loss drift detected on ${label}: ${attenuation.toFixed(1)} dB.`,
          location,
          localizationKm: formatRouteKm(length),
          owner: 'NQMS Rule Engine',
        });
      }
    }

    if (testResult === 'fail' && typeof attenuation === 'number' && attenuation > ATTENUATION_WARNING_DB) {
      await this.createAlarm({
        rtuId,
        fibreId: fibre.id,
        routeId: fibre.id,
        severity: 'minor',
        alarmType: 'High Loss',
        message: `OTDR fail observed on ${label}; verify splice and connector quality.`,
        location,
        localizationKm: formatRouteKm(length),
        owner: 'NQMS Rule Engine',
      });
    }
  }

  private async createAlarm(alarmData: AlarmPayload): Promise<void> {
    const where: Record<string | symbol, unknown> = {
      alarmType: alarmData.alarmType,
      lifecycleStatus: {
        [Op.in]: [...OPEN_LIFECYCLE_STATUSES],
      },
    };

    if (typeof alarmData.rtuId === 'number') {
      where.rtuId = alarmData.rtuId;
    }

    if (typeof alarmData.fibreId === 'number') {
      where.fibreId = alarmData.fibreId;
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
