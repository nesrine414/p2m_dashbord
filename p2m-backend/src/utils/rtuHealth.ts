export type RtuHealthStatus = 'online' | 'offline' | 'warning' | 'unreachable';

export interface RtuHealthLike {
  status?: string | null;
  lastSeen?: string | Date | null;
}

export interface RtuStatusCounts {
  online: number;
  offline: number;
  warning: number;
  unreachable: number;
  total: number;
}

export const HEARTBEAT_STALE_MINUTES = 15;

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getHeartbeatAgeMinutes = (lastSeen?: string | Date | null): number | null => {
  const date = toDate(lastSeen);
  if (!date) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
};

export const isHeartbeatStale = (lastSeen?: string | Date | null): boolean => {
  const ageMinutes = getHeartbeatAgeMinutes(lastSeen);
  return ageMinutes === null || ageMinutes > HEARTBEAT_STALE_MINUTES;
};

export const getEffectiveRtuStatus = (rtu: RtuHealthLike): RtuHealthStatus => {
  const rawStatus = String(rtu.status || '').toLowerCase();

  if (rawStatus === 'offline' || rawStatus === 'unreachable') {
    return rawStatus;
  }

  if (isHeartbeatStale(rtu.lastSeen)) {
    return 'unreachable';
  }

  if (rawStatus === 'warning') {
    return 'warning';
  }

  return 'online';
};

export const withEffectiveRtuStatus = <T extends RtuHealthLike>(
  rtu: T
): Omit<T, 'status'> & { status: RtuHealthStatus } => ({
  ...rtu,
  status: getEffectiveRtuStatus(rtu),
});

export const summarizeRtuHealth = (rtus: Array<RtuHealthLike>): RtuStatusCounts =>
  rtus.reduce<RtuStatusCounts>(
    (acc, rtu) => {
      acc.total += 1;

      switch (getEffectiveRtuStatus(rtu)) {
        case 'offline':
          acc.offline += 1;
          break;
        case 'warning':
          acc.warning += 1;
          break;
        case 'unreachable':
          acc.unreachable += 1;
          break;
        default:
          acc.online += 1;
          break;
      }

      return acc;
    },
    {
      online: 0,
      offline: 0,
      warning: 0,
      unreachable: 0,
      total: 0,
    }
  );
