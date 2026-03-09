import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm } from '../models';
import { emitEvent } from '../utils/websocket';

export const getAlarms = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.json({ data: [], total: 0, page: 1, totalPages: 0, degradedMode: true });
      return;
    }

    const {
      severity,
      status,
      rtuId,
      page = '1',
      pageSize = '20',
    } = req.query as Record<string, string | undefined>;

    const whereClause: Record<string, unknown> = {};
    if (severity) whereClause.severity = severity;
    if (status) whereClause.lifecycleStatus = status;
    if (rtuId) whereClause.rtuId = Number(rtuId);

    const pageNumber = Math.max(Number(page) || 1, 1);
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const offset = (pageNumber - 1) * size;

    const { rows, count } = await Alarm.findAndCountAll({
      where: whereClause,
      order: [['occurredAt', 'DESC']],
      limit: size,
      offset,
    });

    res.json({
      data: rows,
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
    res.json(alarm);
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
    emitEvent('new_alarm', alarm);
    res.status(201).json(alarm);
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

    await alarm.update({
      lifecycleStatus: 'acknowledged',
      acknowledgedAt: new Date(),
      owner: (req.body as { owner?: string }).owner || alarm.owner,
    });

    emitEvent('alarm_updated', alarm);
    res.json(alarm);
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

    await alarm.update({
      lifecycleStatus: 'cleared',
      resolvedAt: new Date(),
      owner: (req.body as { owner?: string }).owner || alarm.owner,
    });

    emitEvent('alarm_updated', alarm);
    res.json(alarm);
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve alarm' });
  }
};

export const getActiveCriticalAlarms = async (): Promise<number> => {
  return Alarm.count({
    where: {
      severity: 'critical',
      lifecycleStatus: { [Op.ne]: 'cleared' },
    },
  });
};
