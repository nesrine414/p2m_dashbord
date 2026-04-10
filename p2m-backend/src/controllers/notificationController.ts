import { Request, Response } from 'express';
import { databaseState } from '../config/database';
import { Notification } from '../models';
import { mapNotification } from '../services/notificationService';

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const query = req.query as Record<string, string | undefined>;
    const page = parsePositiveNumber(query.page, 1);
    const pageSize = Math.min(parsePositiveNumber(query.pageSize, 20), 100);
    const status = query.status || 'all';
    const offset = (page - 1) * pageSize;

    const whereClause: { isRead?: boolean } = {};
    if (status === 'unread') {
      whereClause.isRead = false;
    } else if (status === 'read') {
      whereClause.isRead = true;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['occurredAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    res.json({
      data: rows.map(mapNotification),
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
      unread: await Notification.count({ where: { isRead: false } }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid notification id' });
      return;
    }

    const notification = await Notification.findByPk(id);
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await notification.update({ isRead: true });
    res.json(mapNotification(notification));
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const [updatedCount] = await Notification.update(
      { isRead: true },
      {
        where: { isRead: false },
      }
    );

    res.json({ updated: updatedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};
