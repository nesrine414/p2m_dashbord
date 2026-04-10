import Alarm from '../models/Alarm';
import Fibre from '../models/Fibre';
import RTU from '../models/RTU';
import { emitEvent } from '../utils/websocket';

export interface RealtimeAlarmPayload {
  id: number;
  rtuId: number | null;
  fibreId: number | null;
  routeId: number | null;
  rtuName: string;
  zone: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  lifecycleStatus: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  message: string;
  location: string | null;
  localizationKm: string | null;
  owner: string | null;
  occurredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const resolveAlarmRtu = async (alarm: Alarm): Promise<RTU | null> => {
  const alarmRtuId = (alarm.get('rtuId') as number | null) ?? null;
  if (alarmRtuId) {
    return RTU.findByPk(alarmRtuId);
  }

  const fibreId = (alarm.get('fibreId') as number | null) ?? null;
  if (!fibreId) {
    return null;
  }

  const fibre = await Fibre.findByPk(fibreId);
  const rtuId = (fibre?.get('rtuId') as number | null) ?? null;
  return rtuId ? RTU.findByPk(rtuId) : null;
};

export const toRealtimeAlarmPayload = async (alarm: Alarm): Promise<RealtimeAlarmPayload> => {
  const rtu = await resolveAlarmRtu(alarm);

  return {
    id: alarm.get('id') as number,
    rtuId: (alarm.get('rtuId') as number | null) ?? null,
    fibreId: (alarm.get('fibreId') as number | null) ?? null,
    routeId: (alarm.get('routeId') as number | null) ?? null,
    rtuName: rtu ? ((rtu.get('name') as string) || 'Unknown RTU') : 'Unknown RTU',
    zone: rtu ? ((rtu.get('locationAddress') as string) || 'Unknown zone') : 'Unknown zone',
    severity: alarm.get('severity') as RealtimeAlarmPayload['severity'],
    lifecycleStatus: alarm.get('lifecycleStatus') as RealtimeAlarmPayload['lifecycleStatus'],
    alarmType: alarm.get('alarmType') as RealtimeAlarmPayload['alarmType'],
    message: alarm.get('message') as string,
    location: (alarm.get('location') as string | null) ?? null,
    localizationKm: (alarm.get('localizationKm') as string | null) ?? null,
    owner: (alarm.get('owner') as string | null) ?? null,
    occurredAt: toIsoString(alarm.get('occurredAt') as Date | null) ?? new Date().toISOString(),
    acknowledgedAt: toIsoString(alarm.get('acknowledgedAt') as Date | null),
    resolvedAt: toIsoString(alarm.get('resolvedAt') as Date | null),
  };
};

export const emitNewAlarmRealtime = async (alarm: Alarm): Promise<void> => {
  emitEvent('new_alarm', await toRealtimeAlarmPayload(alarm));
};

export const emitAlarmUpdatedRealtime = async (alarm: Alarm): Promise<void> => {
  emitEvent('alarm_updated', await toRealtimeAlarmPayload(alarm));
};
