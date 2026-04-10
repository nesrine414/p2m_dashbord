import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, RTU } from '../models';
import { demoAlarms, demoFibres, demoRtus } from '../data/demoData';
import { emitAlarmUpdatedRealtime, emitNewAlarmRealtime } from '../services/alarmRealtimeService';
import { emitDashboardKpiUpdate } from '../services/dashboardStatsService';
import { createNotificationForAlarm } from '../services/notificationService';

const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const getActionPayload = (req: Request): { owner?: string; comment?: string } =>
  req.body && typeof req.body === 'object'
    ? (req.body as { owner?: string; comment?: string })
    : {};
const triggerDashboardStatsRealtime = (): void => {
  void emitDashboardKpiUpdate();
};

const mapDemoAlarm = (alarm: (typeof demoAlarms)[number]) => {
  const rtu = demoRtus.find((item) => item.id === alarm.rtuId);

  return {
    ...alarm,
    rtuName: rtu?.name || 'Unknown RTU',
    zone: rtu?.locationAddress || alarm.location,
  };
};

const mapDbAlarm = (alarm: Alarm, rtu?: RTU | null) => ({
  id: alarm.get('id') as number,
  rtuId: (alarm.get('rtuId') as number | null) ?? null,
  fibreId: (alarm.get('fibreId') as number | null) ?? null,
  routeId: (alarm.get('routeId') as number | null) ?? null,
  rtuName: rtu ? ((rtu.get('name') as string) || 'Unknown RTU') : 'Unknown RTU',
  zone: rtu ? ((rtu.get('locationAddress') as string) || 'Unknown zone') : 'Unknown zone',
  severity: alarm.get('severity') as string,
  lifecycleStatus: alarm.get('lifecycleStatus') as string,
  alarmType: alarm.get('alarmType') as string,
  message: alarm.get('message') as string,
  location: (alarm.get('location') as string | null) || null,
  localizationKm: (alarm.get('localizationKm') as string | null) || null,
  owner: (alarm.get('owner') as string | null) || null,
  occurredAt: alarm.get('occurredAt') as Date,
  acknowledgedAt: (alarm.get('acknowledgedAt') as Date | null) || null,
  resolvedAt: (alarm.get('resolvedAt') as Date | null) || null,
});

const respondWithMappedAlarm = async (alarm: Alarm, res: Response): Promise<void> => {
  const rtu = await resolveAlarmRtu(alarm);
  res.json(mapDbAlarm(alarm, rtu));
};

const restoreNetworkAfterClosure = async (alarm: Alarm): Promise<void> => {
  const alarmType = alarm.get('alarmType') as string;
  const fibreId = (alarm.get('fibreId') as number | null) ?? null;

  const rtu = await resolveAlarmRtu(alarm);
  if (rtu) {
    const currentPower = (rtu.get('power') as 'normal' | 'failure' | null) ?? null;
    const currentTemperature = (rtu.get('temperature') as number | null) ?? null;
    const currentOtdr = (rtu.get('otdrStatus') as 'ready' | 'busy' | 'fault' | null) ?? null;

    await rtu.update({
      status: 'online',
      power: currentPower === 'failure' ? 'normal' : currentPower ?? 'normal',
      temperature:
        alarmType === 'Temperature'
          ? 30
          : typeof currentTemperature === 'number' && currentTemperature > 40
            ? 36
            : currentTemperature ?? 30,
      otdrStatus: currentOtdr === 'fault' ? 'ready' : currentOtdr ?? 'ready',
      lastSeen: new Date(),
    });
  }

  if (fibreId) {
    const fibre = await Fibre.findByPk(fibreId);
    if (fibre) {
      const lengthKm = (fibre.get('length') as number | null) ?? 10;
      await fibre.update({ status: 'normal' });

      const nextMeasurementId = (((await Measurement.max('id')) as number | null) ?? 0) + 1;
      await Measurement.create({
        id: nextMeasurementId,
        fibreId: fibre.get('id') as number,
        attenuation: Number(Math.max(2.5, Math.min(5.5, lengthKm / 4)).toFixed(1)),
        testResult: 'pass',
        wavelength: 1550,
        timestamp: new Date(),
      });
    }
  }
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

export const getAlarms = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      severity,
      status,
      rtuId,
      page = '1',
      pageSize = '20',
    } = req.query as Record<string, string | undefined>;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const offset = (pageNumber - 1) * size;

    if (!databaseState.connected) {
      const filtered = demoAlarms
        .filter((alarm) => {
          const severityMatch = !severity || alarm.severity === severity;
          const statusMatch = !status || alarm.lifecycleStatus === status;
          const rtuMatch = !rtuId || alarm.rtuId === Number(rtuId);
          return severityMatch && statusMatch && rtuMatch;
        })
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      const paged = filtered.slice(offset, offset + size).map(mapDemoAlarm);

      res.json({
        data: paged,
        total: filtered.length,
        page: pageNumber,
        totalPages: Math.ceil(filtered.length / size),
        degradedMode: true,
      });
      return;
    }

    const whereClause: Record<string | symbol, unknown> = {};
    if (severity) {
      whereClause.severity = severity;
    }
    if (status) {
      whereClause.lifecycleStatus = status;
    }

    if (rtuId) {
      const fibreIds = await Fibre.findAll({
        where: { rtuId: Number(rtuId) },
        attributes: ['id'],
      });

      whereClause[Op.or] = [
        { rtuId: Number(rtuId) },
        { fibreId: { [Op.in]: fibreIds.map((item) => item.get('id') as number) } },
      ];
    }

    const { rows, count } = await Alarm.findAndCountAll({
      where: whereClause,
      order: [['occurredAt', 'DESC']],
      limit: size,
      offset,
    });

    const mapped = await Promise.all(
      rows.map(async (alarm) => {
        const rtu = await resolveAlarmRtu(alarm);
        return mapDbAlarm(alarm, rtu);
      })
    );

    res.json({
      data: mapped,
      total: count,
      page: pageNumber,
      totalPages: Math.ceil(count / size),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alarms' });
  }
};

export const getAlarmById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!databaseState.connected) {
      const alarm = demoAlarms.find((item) => item.id === id);
      if (!alarm) {
        res.status(404).json({ error: 'Alarm not found' });
        return;
      }

      res.json(mapDemoAlarm(alarm));
      return;
    }

    const alarm = await Alarm.findByPk(id);
    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const rtu = await resolveAlarmRtu(alarm);
    res.json(mapDbAlarm(alarm, rtu));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alarm' });
  }
};

export const createAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const payload = {
      ...req.body,
      occurredAt: req.body.occurredAt || new Date(),
    };
    const alarm = await Alarm.create(payload);
    await emitNewAlarmRealtime(alarm);
    await createNotificationForAlarm(alarm);
    triggerDashboardStatsRealtime();
    res.status(201);
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create alarm' });
  }
};

export const acknowledgeAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const alarm = await Alarm.findByPk(id);

    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const payload = getActionPayload(req);

    await alarm.update({
      lifecycleStatus: 'acknowledged',
      acknowledgedAt: new Date(),
      owner: payload.owner || alarm.owner,
    });

    await emitAlarmUpdatedRealtime(alarm);
    triggerDashboardStatsRealtime();
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to acknowledge alarm' });
  }
};

export const resolveAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const alarm = await Alarm.findByPk(id);

    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const payload = getActionPayload(req);

    await alarm.update({
      lifecycleStatus: 'closed',
      resolvedAt: new Date(),
      owner: payload.owner || alarm.owner,
    });

    await emitAlarmUpdatedRealtime(alarm);
    triggerDashboardStatsRealtime();
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve alarm' });
  }
};

export const inProgressAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const alarm = await Alarm.findByPk(id);

    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const payload = getActionPayload(req);

    await alarm.update({
      lifecycleStatus: 'in_progress',
      owner: payload.owner || alarm.owner,
    });

    await emitAlarmUpdatedRealtime(alarm);
    triggerDashboardStatsRealtime();
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to mark alarm in progress' });
  }
};

export const resolvedAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const alarm = await Alarm.findByPk(id);

    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const payload = getActionPayload(req);

    await alarm.update({
      lifecycleStatus: 'resolved',
      resolvedAt: new Date(),
      resolutionComment: payload.comment || undefined,
      owner: payload.owner || alarm.owner,
    });

    await emitAlarmUpdatedRealtime(alarm);
    triggerDashboardStatsRealtime();
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve alarm' });
  }
};

export const closeAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const alarm = await Alarm.findByPk(id);

    if (!alarm) {
      res.status(404).json({ error: 'Alarm not found' });
      return;
    }

    const payload = getActionPayload(req);

    await alarm.update({
      lifecycleStatus: 'closed',
      resolvedAt: new Date(),
      owner: payload.owner || alarm.owner,
    });

    await restoreNetworkAfterClosure(alarm);

    await emitAlarmUpdatedRealtime(alarm);
    triggerDashboardStatsRealtime();
    await respondWithMappedAlarm(alarm, res);
  } catch (error) {
    res.status(400).json({ error: 'Failed to close alarm' });
  }
};

export const getActiveCriticalAlarms = async (): Promise<number> =>
  Alarm.count({
    where: {
      severity: 'critical',
      lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES },
    },
  });
