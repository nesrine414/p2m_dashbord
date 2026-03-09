import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, FiberRoute, RTU } from '../models';

const calculateMTTR = async (): Promise<number> => {
  const resolvedAlarms = await Alarm.findAll({
    where: {
      lifecycleStatus: 'cleared',
    },
  });

  if (resolvedAlarms.length === 0) {
    return 0;
  }

  const totalHours = resolvedAlarms.reduce((acc, alarm) => {
    if (!alarm.resolvedAt || !alarm.occurredAt) {
      return acc;
    }
    const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
    return acc + diffMs / (1000 * 60 * 60);
  }, 0);

  return Number((totalHours / resolvedAlarms.length).toFixed(2));
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.json({
        rtuOnline: 0,
        rtuOffline: 0,
        rtuWarning: 0,
        rtuUnreachable: 0,
        rtuTotal: 0,
        criticalAlarms: 0,
        majorAlarms: 0,
        minorAlarms: 0,
        mttr: 0,
        availability: 0,
        degradedMode: true,
      });
      return;
    }

    const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable] = await Promise.all([
      RTU.count({ where: { status: 'online' } }),
      RTU.count({ where: { status: 'offline' } }),
      RTU.count({ where: { status: 'warning' } }),
      RTU.count({ where: { status: 'unreachable' } }),
    ]);

    const [criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
      Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
      Alarm.count({ where: { severity: 'major', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
      Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
    ]);

    const rtuTotal = rtuOnline + rtuOffline + rtuWarning + rtuUnreachable;
    const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
    const mttr = await calculateMTTR();

    res.json({
      rtuOnline,
      rtuOffline,
      rtuWarning,
      rtuUnreachable,
      rtuTotal,
      criticalAlarms,
      majorAlarms,
      minorAlarms,
      mttr,
      availability,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getTopology = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.json({ routes: [], degradedMode: true });
      return;
    }

    const routes = await FiberRoute.findAll({
      order: [['id', 'ASC']],
    });

    res.json({ routes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topology' });
  }
};
