import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, RTU } from '../models';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';
import { classifyFibreAgingStatus, computeAttenuationPerKm } from '../utils/fibreAging';
import { emitEvent } from '../utils/websocket';

const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const RESOLVED_ALARM_LIFECYCLE_STATUSES = ['resolved', 'closed', 'cleared'] as const;

export interface DashboardStatsSnapshot {
  rtuOnline: number;
  rtuOffline: number;
  rtuWarning: number;
  rtuUnreachable: number;
  rtuTotal: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  mttr: number;
  mtbf: number;
  averageAttenuation: number;
  availability: number;
  agingFibresCount: number;
  degradedMode?: boolean;
}

const calculateMTTR = async (): Promise<number> => {
  const resolvedAlarms = await Alarm.findAll({
    where: {
      lifecycleStatus: {
        [Op.in]: RESOLVED_ALARM_LIFECYCLE_STATUSES,
      },
    },
  });

  if (resolvedAlarms.length === 0) {
    return 0;
  }

  const validDurationsHours = resolvedAlarms
    .map((alarm) => {
      if (!alarm.resolvedAt || !alarm.occurredAt) {
        return null;
      }

      const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) {
        return null;
      }

      return diffMs / (1000 * 60 * 60);
    })
    .filter((duration): duration is number => typeof duration === 'number');

  if (validDurationsHours.length === 0) {
    return 0;
  }

  const totalHours = validDurationsHours.reduce((acc, value) => acc + value, 0);
  return Number((totalHours / validDurationsHours.length).toFixed(4));
};

const calculateAverageAttenuation = async (): Promise<number> => {
  const measurements = await Measurement.findAll({
    order: [['timestamp', 'DESC']],
    attributes: ['fibreId', 'attenuation'],
  });

  const latestByFibre = new Map<number, number>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    const attenuation = measurement.get('attenuation') as number | null;

    if (latestByFibre.has(fibreId)) {
      return;
    }

    if (typeof attenuation === 'number' && attenuation > 0) {
      latestByFibre.set(fibreId, attenuation);
    }
  });

  if (latestByFibre.size === 0) {
    return 0;
  }

  const sum = Array.from(latestByFibre.values()).reduce((acc, value) => acc + value, 0);
  return Number((sum / latestByFibre.size).toFixed(1));
};

const calculateEstimatedMTBF = async (rtuTotal: number): Promise<number> => {
  const [openAlarmCount, degradedOrBrokenFibres, measurements] = await Promise.all([
    Alarm.count({
      where: {
        lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES },
      },
    }),
    Fibre.count({
      where: {
        status: { [Op.in]: ['degraded', 'broken'] },
      },
    }),
    Measurement.findAll({
      order: [['timestamp', 'DESC']],
      attributes: ['fibreId', 'testResult'],
    }),
  ]);

  const latestByFibre = new Map<number, string | null>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    if (latestByFibre.has(fibreId)) {
      return;
    }

    latestByFibre.set((measurement.get('fibreId') as number) ?? fibreId, (measurement.get('testResult') as string | null) ?? null);
  });

  const failedLatestTests = Array.from(latestByFibre.values()).filter((result) => result === 'fail').length;
  const incidentLoad = Math.max(1, openAlarmCount + degradedOrBrokenFibres + failedLatestTests);
  const networkScale = Math.max(1, rtuTotal);

  return Number(((networkScale * 168) / incidentLoad).toFixed(1));
};

const calculateAgingFibresCount = async (): Promise<number> => {
  const [fibres, measurements] = await Promise.all([
    Fibre.findAll({
      attributes: ['id', 'length', 'status'],
      order: [['id', 'ASC']],
    }),
    Measurement.findAll({
      order: [['timestamp', 'DESC']],
      attributes: ['fibreId', 'attenuation'],
    }),
  ]);

  const latestByFibre = new Map<number, number | null>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    if (latestByFibre.has(fibreId)) {
      return;
    }

    latestByFibre.set(fibreId, (measurement.get('attenuation') as number | null) ?? null);
  });

  let agingCount = 0;
  fibres.forEach((fibre) => {
    const fibreId = fibre.get('id') as number;
    const fibreStatus = (fibre.get('status') as string | null) ?? null;
    const ratio = computeAttenuationPerKm(
      latestByFibre.get(fibreId) ?? null,
      (fibre.get('length') as number | null) ?? null
    );
    const agingStatus = classifyFibreAgingStatus(ratio, fibreStatus);

    if (agingStatus === 'aging' || agingStatus === 'critical') {
      agingCount += 1;
    }
  });

  return agingCount;
};

const getDemoStatsSnapshot = (): DashboardStatsSnapshot => {
  const rtuOnline = demoRtus.filter((item) => item.status === 'online').length;
  const rtuOffline = demoRtus.filter((item) => item.status === 'offline').length;
  const rtuWarning = 0;
  const rtuUnreachable = demoRtus.filter((item) => item.status === 'unreachable').length;
  const rtuTotal = demoRtus.length;
  const criticalAlarms = demoAlarms.filter(
    (item) =>
      item.severity === 'critical' &&
      OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
  ).length;
  const majorAlarms = demoAlarms.filter(
    (item) =>
      item.severity === 'major' &&
      OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
  ).length;
  const minorAlarms = demoAlarms.filter(
    (item) =>
      item.severity === 'minor' &&
      OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
  ).length;
  const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
  const averageAttenuation = Number(
    (
      demoFiberRoutes
        .filter((route) => typeof route.attenuationDb === 'number' && route.attenuationDb > 0)
        .reduce((acc, route) => acc + (route.attenuationDb || 0), 0) /
      Math.max(
        1,
        demoFiberRoutes.filter((route) => typeof route.attenuationDb === 'number' && route.attenuationDb > 0).length
      )
    ).toFixed(1)
  );
  const incidentLoad = Math.max(
    1,
    criticalAlarms +
      demoFiberRoutes.filter((route) => route.fiberStatus !== 'normal').length +
      demoOtdrTests.filter((test) => test.result === 'fail').length
  );
  const mtbf = Number(((Math.max(1, rtuTotal) * 168) / incidentLoad).toFixed(1));
  const agingFibresCount = demoFiberRoutes.filter((route) => {
    const length = typeof route.lengthKm === 'number' ? route.lengthKm : null;
    const attenuation = typeof route.attenuationDb === 'number' ? route.attenuationDb : null;
    const ratio = computeAttenuationPerKm(attenuation, length);
    const status = classifyFibreAgingStatus(ratio, route.fiberStatus);
    return status === 'aging' || status === 'critical';
  }).length;

  return {
    rtuOnline,
    rtuOffline,
    rtuWarning,
    rtuUnreachable,
    rtuTotal,
    criticalAlarms,
    majorAlarms,
    minorAlarms,
    mttr: 2.4,
    mtbf,
    averageAttenuation,
    availability,
    agingFibresCount,
    degradedMode: true,
  };
};

export const getDashboardStatsSnapshot = async (): Promise<DashboardStatsSnapshot> => {
  if (!databaseState.connected) {
    return getDemoStatsSnapshot();
  }

  const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable, criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
    RTU.count({ where: { status: 'online' } }),
    RTU.count({ where: { status: 'offline' } }),
    RTU.count({ where: { status: 'warning' } }),
    RTU.count({ where: { status: 'unreachable' } }),
    Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
    Alarm.count({ where: { severity: 'major', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
    Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
  ]);

  const rtuTotal = rtuOnline + rtuOffline + rtuWarning + rtuUnreachable;
  const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
  const [mttr, mtbf, averageAttenuation, agingFibresCount] = await Promise.all([
    calculateMTTR(),
    calculateEstimatedMTBF(rtuTotal),
    calculateAverageAttenuation(),
    calculateAgingFibresCount(),
  ]);

  return {
    rtuOnline,
    rtuOffline,
    rtuWarning,
    rtuUnreachable,
    rtuTotal,
    criticalAlarms,
    majorAlarms,
    minorAlarms,
    mttr,
    mtbf,
    averageAttenuation,
    availability,
    agingFibresCount,
  };
};

export const emitDashboardKpiUpdate = async (): Promise<void> => {
  const snapshot = await getDashboardStatsSnapshot();
  emitEvent('kpi_updated', {
    ...snapshot,
    sampledAt: new Date().toISOString(),
  });
};
