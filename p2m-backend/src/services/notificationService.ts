import { Alarm, Fibre, Notification, RTU } from '../models';
import { emitEvent } from '../utils/websocket';

const mapDbNotification = (notification: Notification) => ({
  id: notification.get('id') as number,
  alarmId: (notification.get('alarmId') as number | null) ?? null,
  notificationType: notification.get('notificationType') as 'alarm_new' | 'alarm_update' | 'system',
  severity: notification.get('severity') as 'critical' | 'major' | 'minor' | 'info',
  title: notification.get('title') as string,
  message: notification.get('message') as string,
  isRead: notification.get('isRead') as boolean,
  metadata: (notification.get('metadata') as Record<string, unknown> | null) ?? null,
  occurredAt: notification.get('occurredAt') as Date,
  createdAt: notification.get('created_at') as Date,
  updatedAt: notification.get('updated_at') as Date,
});

const resolveAlarmRtuName = async (alarm: Alarm): Promise<string> => {
  const alarmRtuId = (alarm.get('rtuId') as number | null) ?? null;
  if (alarmRtuId) {
    const rtu = await RTU.findByPk(alarmRtuId);
    const name = (rtu?.get('name') as string | null) ?? null;
    return name || `RTU-${alarmRtuId}`;
  }

  const fibreId = (alarm.get('fibreId') as number | null) ?? null;
  if (!fibreId) {
    return 'RTU inconnu';
  }

  const fibre = await Fibre.findByPk(fibreId);
  const rtuId = (fibre?.get('rtuId') as number | null) ?? null;
  if (!rtuId) {
    return 'RTU inconnu';
  }

  const rtu = await RTU.findByPk(rtuId);
  const name = (rtu?.get('name') as string | null) ?? null;
  return name || `RTU-${rtuId}`;
};

export const createNotificationForAlarm = async (alarm: Alarm): Promise<Notification> => {
  const alarmId = alarm.get('id') as number;
  const severity = alarm.get('severity') as 'critical' | 'major' | 'minor' | 'info';
  const message = alarm.get('message') as string;
  const alarmType = alarm.get('alarmType') as string;
  const lifecycleStatus = alarm.get('lifecycleStatus') as string;
  const occurredAt = (alarm.get('occurredAt') as Date | null) ?? new Date();
  const rtuName = await resolveAlarmRtuName(alarm);

  const notification = await Notification.create({
    alarmId,
    notificationType: 'alarm_new',
    severity,
    title: `Nouvelle alarme ${severity}`,
    message: `${rtuName}: ${message}`,
    metadata: {
      alarmType,
      lifecycleStatus,
      rtuName,
    },
    occurredAt,
  });

  emitEvent('new_notification', mapDbNotification(notification));

  return notification;
};

export const mapNotification = mapDbNotification;
