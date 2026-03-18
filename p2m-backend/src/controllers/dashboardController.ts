import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, FiberRoute, OtdrTestResult, RTU } from '../models';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';

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
      const rtuOnline = demoRtus.filter((item) => item.status === 'online').length;
      const rtuOffline = demoRtus.filter((item) => item.status === 'offline').length;
      const rtuWarning = demoRtus.filter((item) => item.status === 'warning').length;
      const rtuUnreachable = demoRtus.filter((item) => item.status === 'unreachable').length;
      const criticalAlarms = demoAlarms.filter(
        (item) => item.severity === 'critical' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const majorAlarms = demoAlarms.filter(
        (item) => item.severity === 'major' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const minorAlarms = demoAlarms.filter(
        (item) => item.severity === 'minor' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const rtuTotal = demoRtus.length;
      const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;

      res.json({
        rtuOnline,
        rtuOffline,
        rtuWarning,
        rtuUnreachable,
        rtuTotal,
        criticalAlarms,
        majorAlarms,
        minorAlarms,
        mttr: 2.4,
        availability,
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
      res.json({ routes: demoFiberRoutes, degradedMode: true });
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

export const getRecentOtdrTests = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      const tests = demoOtdrTests.map((test) => {
        const route = demoFiberRoutes.find((item) => item.id === test.routeId);
        return {
          ...test,
          routeName: route?.routeName || 'Unknown',
        };
      });
      res.json({ data: tests, degradedMode: true });
      return;
    }

    const tests = await OtdrTestResult.findAll({
      include: [{ model: FiberRoute, as: 'route', attributes: ['id', 'routeName'] }],
      order: [['testedAt', 'DESC']],
      limit: 20,
    });

    const mapped = tests.map((test) => {
      const route = test.get('route') as FiberRoute | undefined;
      return {
        id: test.get('id') as number,
        mode: test.get('mode') as string,
        pulseWidth: test.get('pulseWidth') as string | null,
        dynamicRangeDb: test.get('dynamicRangeDb') as number | null,
        wavelengthNm: test.get('wavelengthNm') as number,
        result: test.get('result') as string,
        testedAt: test.get('testedAt') as Date,
        routeId: test.get('routeId') as number | null,
        routeName: route ? (route.get('routeName') as string) : 'Unknown',
      };
    });

    res.json({ data: mapped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OTDR tests' });
  }
};
