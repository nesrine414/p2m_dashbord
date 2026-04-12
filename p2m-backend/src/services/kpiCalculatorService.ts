import DashboardSnapshot from '../models/DashboardSnapshot';
import Performance from '../models/Performance';
import {
  SupervisionAlarmLifecycle,
  SupervisionAlarmRecord,
  SupervisionDashboardSnapshot,
  SupervisionKpiInput,
  SupervisionMeasurementRecord,
  SupervisionPerformanceRecord,
  SupervisionRtuRecord,
  SupervisionRtuSummary,
} from '../types/supervision';

const OPEN_STATUSES: SupervisionAlarmLifecycle[] = ['active', 'acknowledged', 'in_progress'];
const RESOLVED_STATUSES: SupervisionAlarmLifecycle[] = ['resolved', 'closed'];

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const round = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const avg = (values: number[]): number => {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? round(clean.reduce((sum, value) => sum + value, 0) / clean.length) : 0;
};

const latestByKey = <T>(items: T[], keyFn: (item: T) => string, dateFn: (item: T) => Date | null): Map<string, T> => {
  const latest = new Map<string, T>();
  items.forEach((item) => {
    const key = keyFn(item);
    const date = dateFn(item);
    if (!date) return;
    const current = latest.get(key);
    if (!current || date.getTime() >= (dateFn(current)?.getTime() || 0)) {
      latest.set(key, item);
    }
  });
  return latest;
};

const isOpen = (alarm: SupervisionAlarmRecord) => OPEN_STATUSES.includes(alarm.lifecycleStatus);
const isResolved = (alarm: SupervisionAlarmRecord) => RESOLVED_STATUSES.includes(alarm.lifecycleStatus);

export const calculateDashboardSnapshot = (input: SupervisionKpiInput): SupervisionDashboardSnapshot => {
  const latestMeasurements = latestByKey(input.measurements, (m) => String(m.fibreId), (m) => toDate(m.timestamp));
  const latestPerformances = latestByKey(input.performances, (p) => String(p.fibreId), (p) => toDate(p.recordedAt));

  const rtuOnline = input.rtus.filter((rtu) => rtu.status === 'online').length;
  const rtuOffline = input.rtus.filter((rtu) => rtu.status === 'offline').length;
  const rtuWarning = input.rtus.filter((rtu) => rtu.status === 'warning').length;
  const rtuUnreachable = input.rtus.filter((rtu) => rtu.status === 'unreachable').length;
  const rtuTotal = input.rtus.length;

  const criticalAlarms = input.alarms.filter((alarm) => isOpen(alarm) && alarm.severity === 'critical').length;
  const majorAlarms = input.alarms.filter((alarm) => isOpen(alarm) && alarm.severity === 'major').length;
  const minorAlarms = input.alarms.filter((alarm) => isOpen(alarm) && alarm.severity === 'minor').length;
  const openAlarms = input.alarms.filter(isOpen).length;

  const brokenFibres = input.fibres.filter((fibre) => fibre.status === 'broken').length;
  const degradedFibres = input.fibres.filter((fibre) => fibre.status === 'degraded').length;

  const latestMeasurementValues = Array.from(latestMeasurements.values());
  const averageAttenuationDb = avg(
    latestMeasurementValues
      .map((measurement) => measurement.attenuation)
      .filter((value): value is number => typeof value === 'number')
  );
  const otdrFailures = latestMeasurementValues.filter((measurement) => measurement.testResult === 'fail').length;

  const resolvedDurations = input.alarms
    .filter(isResolved)
    .map((alarm) => {
      const start = toDate(alarm.occurredAt);
      const end = toDate(alarm.resolvedAt);
      if (!start || !end) return null;
      const diff = end.getTime() - start.getTime();
      return diff > 0 ? diff / 36e5 : null;
    })
    .filter((value): value is number => value !== null);

  const performanceMttr = Array.from(latestPerformances.values())
    .map((performance) => (typeof performance.mttr === 'number' ? performance.mttr : null))
    .filter((value): value is number => value !== null);
  const performanceMtbf = Array.from(latestPerformances.values())
    .map((performance) => (typeof performance.mtbf === 'number' ? performance.mtbf : null))
    .filter((value): value is number => value !== null);

  let mttrSource = 'none';
  let mttrHours = 0;
  if (resolvedDurations.length) {
    mttrHours = avg(resolvedDurations);
    mttrSource = 'resolved_alarms';
  } else if (performanceMttr.length) {
    mttrHours = avg(performanceMttr);
    mttrSource = 'performance_snapshots';
  }

  let mtbfSource = 'none';
  let mtbfHours = 0;
  if (performanceMtbf.length) {
    mtbfHours = avg(performanceMtbf);
    mtbfSource = 'performance_snapshots';
  } else {
    const gaps: number[] = [];
    const byTarget = new Map<string, Date[]>();
    input.alarms.forEach((alarm) => {
      const start = toDate(alarm.occurredAt);
      if (!start) return;
      const key = String(alarm.rtuId ?? alarm.fibreId ?? alarm.routeId ?? 'global');
      const arr = byTarget.get(key) || [];
      arr.push(start);
      byTarget.set(key, arr);
    });

    byTarget.forEach((dates) => {
      const ordered = dates.sort((left, right) => left.getTime() - right.getTime());
      for (let index = 1; index < ordered.length; index += 1) {
        const diff = ordered[index].getTime() - ordered[index - 1].getTime();
        if (diff > 0) {
          gaps.push(diff / 36e5);
        }
      }
    });

    if (gaps.length) {
      mtbfHours = avg(gaps);
      mtbfSource = 'incident_history';
    }
  }

  const availabilityPercent = rtuTotal ? round((rtuOnline / rtuTotal) * 100) : 0;
  const incidentLoad = criticalAlarms + brokenFibres + otdrFailures;

  return {
    rtuOnline,
    rtuOffline,
    rtuWarning,
    rtuUnreachable,
    rtuTotal,
    criticalAlarms,
    majorAlarms,
    minorAlarms,
    openAlarms,
    brokenFibres,
    degradedFibres,
    otdrFailures,
    averageAttenuationDb,
    mttrHours,
    mtbfHours,
    availabilityPercent,
    incidentLoad,
    source: input.source,
    generatedAt: new Date().toISOString(),
    formulaNotes: {
      mttr:
        mttrSource === 'resolved_alarms'
          ? 'Average of resolvedAt - occurredAt for resolved alarms.'
          : mttrSource === 'performance_snapshots'
            ? 'Average of the latest MTTR snapshot per fibre.'
            : 'No resolved incidents yet.',
      mtbf:
        mtbfSource === 'performance_snapshots'
          ? 'Average of the latest MTBF snapshot per fibre.'
          : mtbfSource === 'incident_history'
            ? 'Average time between consecutive incidents on the same RTU/fibre.'
            : 'Not enough history yet.',
      availability: 'online RTUs / total RTUs * 100.',
      attenuation: 'Average of the latest attenuation measurement per fibre.',
      otdrFailures: 'Count of the latest failed OTDR measurements per fibre.',
      fibreStatus: 'Count of fibres by current status.',
    },
  };
};

export const calculateRtuSummary = (input: {
  rtu: SupervisionRtuRecord;
  fibres: Array<{ fibreId: number; fiberStatus: string }>;
  alarms: SupervisionAlarmRecord[];
  measurements: SupervisionMeasurementRecord[];
}): SupervisionRtuSummary => {
  const fibreIds = new Set(input.fibres.map((fibre) => fibre.fibreId));
  const relevantAlarms = input.alarms.filter((alarm) => {
    if (alarm.rtuId === input.rtu.id) return true;
    if (typeof alarm.fibreId === 'number' && fibreIds.has(alarm.fibreId)) return true;
    if (typeof alarm.routeId === 'number' && fibreIds.has(alarm.routeId)) return true;
    return false;
  });

  const latestMeasurements = latestByKey(
    input.measurements.filter((measurement) => fibreIds.has(measurement.fibreId)),
    (m) => String(m.fibreId),
    (m) => toDate(m.timestamp)
  );
  const latest = Array.from(latestMeasurements.values()).sort(
    (left, right) => (toDate(right.timestamp)?.getTime() || 0) - (toDate(left.timestamp)?.getTime() || 0)
  )[0];

  const brokenFibres = input.fibres.filter((fibre) => fibre.fiberStatus === 'broken').length;
  const degradedFibres = input.fibres.filter((fibre) => fibre.fiberStatus === 'degraded').length;
  const activeAlarms = relevantAlarms.filter(isOpen).length;
  const criticalAlarms = relevantAlarms.filter((alarm) => isOpen(alarm) && alarm.severity === 'critical').length;
  const averageAttenuationDb = avg(
    Array.from(latestMeasurements.values())
      .map((measurement) => measurement.attenuation)
      .filter((value): value is number => typeof value === 'number')
  );

  const penalty =
    activeAlarms * 4 +
    criticalAlarms * 14 +
    brokenFibres * 12 +
    degradedFibres * 6 +
    (input.rtu.status === 'online' ? 0 : 10) +
    (input.rtu.power === 'failure' ? 12 : 0) +
    (typeof input.rtu.temperature === 'number' && input.rtu.temperature > 40 ? (input.rtu.temperature - 40) * 1.5 : 0);

  return {
    activeAlarms,
    criticalAlarms,
    brokenFibres,
    degradedFibres,
    averageAttenuationDb,
    otdrAvailabilityStatus: input.rtu.otdrStatus || 'fault',
    latestTestResult: latest?.testResult ?? null,
    latestTestTime: latest ? new Date(latest.timestamp).toISOString() : null,
    healthScore: Math.max(0, Math.min(100, round(100 - penalty))),
  };
};

export const persistDashboardSnapshot = async (snapshot: SupervisionDashboardSnapshot): Promise<DashboardSnapshot | null> => {
  try {
    return await DashboardSnapshot.create({
      rtuOnline: snapshot.rtuOnline,
      rtuOffline: snapshot.rtuOffline,
      rtuWarning: snapshot.rtuWarning,
      criticalAlarms: snapshot.criticalAlarms,
      majorAlarms: snapshot.majorAlarms,
      minorAlarms: snapshot.minorAlarms,
      mttrHours: snapshot.mttrHours,
      mtbfHours: snapshot.mtbfHours,
      availabilityPercent: snapshot.availabilityPercent,
      capturedAt: new Date(),
    });
  } catch (error) {
    console.warn('Failed to persist dashboard snapshot:', error);
    return null;
  }
};

export const persistPerformanceSnapshot = async (input: {
  fibreId: number;
  mttrHours: number;
  mtbfHours: number;
  recordedAt?: Date;
}): Promise<Performance | null> => {
  try {
    return await Performance.create({
      fibreId: input.fibreId,
      mttr: input.mttrHours,
      mtbf: input.mtbfHours,
      recordedAt: input.recordedAt || new Date(),
    });
  } catch (error) {
    console.warn(`Failed to persist performance snapshot for fibre ${input.fibreId}:`, error);
    return null;
  }
};
