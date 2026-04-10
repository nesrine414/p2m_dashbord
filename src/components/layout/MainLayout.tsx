import React, { useEffect, useRef, useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header, { NotificationItem } from './Header';
import FloatingChatbot from '../chatbot/FloatingChatbot';
import AlarmNotification from '../notifications/AlarmNotification';
import getSocket from '../../utils/socket';
import {
  BackendAlarm,
  BackendNotification,
  getNotifications,
  markAllNotificationsRead,
} from '../../services/api';

const DRAWER_WIDTH = 240;
const MAX_NOTIFICATIONS = 25;

const toRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return 'maintenant';
  }

  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) {
    return 'a l instant';
  }
  if (diffMin < 60) {
    return `il y a ${diffMin} min`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `il y a ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays} j`;
};

const normalizeLifecycleStatus = (status: unknown): BackendAlarm['lifecycleStatus'] => {
  if (
    status === 'active' ||
    status === 'acknowledged' ||
    status === 'in_progress' ||
    status === 'resolved' ||
    status === 'closed' ||
    status === 'cleared'
  ) {
    return status;
  }
  return 'active';
};

const normalizeSeverity = (severity: unknown): BackendAlarm['severity'] => {
  if (severity === 'critical' || severity === 'major' || severity === 'minor' || severity === 'info') {
    return severity;
  }
  return 'info';
};

const normalizeNotificationType = (type: unknown): BackendNotification['notificationType'] => {
  if (type === 'alarm_new' || type === 'alarm_update' || type === 'system') {
    return type;
  }
  return 'system';
};

const toBackendAlarm = (payload: unknown): BackendAlarm => {
  const source = payload as Record<string, unknown>;

  const id = Number(source.id ?? 0);
  const rtuId = source.rtuId ?? source.rtu_id;
  const occurredAt = source.occurredAt ?? source.occurred_at ?? new Date().toISOString();

  return {
    id: Number.isFinite(id) ? id : 0,
    rtuId: typeof rtuId === 'number' ? rtuId : rtuId ? Number(rtuId) : null,
    rtuName: typeof source.rtuName === 'string' ? source.rtuName : undefined,
    zone: typeof source.zone === 'string' ? source.zone : undefined,
    severity: normalizeSeverity(source.severity),
    lifecycleStatus: normalizeLifecycleStatus(source.lifecycleStatus ?? source.lifecycle_status),
    alarmType: (typeof source.alarmType === 'string' ? source.alarmType : 'Maintenance') as BackendAlarm['alarmType'],
    message: typeof source.message === 'string' ? source.message : 'Alarme detectee.',
    location: typeof source.location === 'string' ? source.location : null,
    localizationKm: typeof source.localizationKm === 'string' ? source.localizationKm : null,
    owner: typeof source.owner === 'string' ? source.owner : null,
    occurredAt: String(occurredAt),
  };
};

const toBackendNotification = (payload: unknown): BackendNotification => {
  const source = payload as Record<string, unknown>;
  const id = Number(source.id ?? 0);
  const alarmId = source.alarmId ?? source.alarm_id;
  const occurredAt = source.occurredAt ?? source.occurred_at ?? source.createdAt ?? new Date().toISOString();

  return {
    id: Number.isFinite(id) ? id : 0,
    alarmId: typeof alarmId === 'number' ? alarmId : alarmId ? Number(alarmId) : null,
    notificationType: normalizeNotificationType(source.notificationType ?? source.notification_type),
    severity: normalizeSeverity(source.severity),
    title: typeof source.title === 'string' ? source.title : 'Notification',
    message: typeof source.message === 'string' ? source.message : 'Nouvelle notification.',
    isRead: Boolean(source.isRead ?? source.is_read),
    metadata: (source.metadata as Record<string, unknown> | null) ?? null,
    occurredAt: String(occurredAt),
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,
  };
};

const toHeaderItem = (notification: BackendNotification): NotificationItem => ({
  id: `notification-${notification.id}`,
  backendId: notification.id,
  alarmId: notification.alarmId ?? null,
  type: notification.notificationType.startsWith('alarm') ? 'alarm' : 'system',
  title: notification.title,
  message: notification.message,
  time: toRelativeTime(notification.occurredAt),
  read: notification.isRead,
});

const buildUpdateNotification = (alarm: BackendAlarm): NotificationItem => ({
  id: `alarm-update-${alarm.id}-${Date.now()}`,
  alarmId: alarm.id,
  type: 'system',
  title: 'Alarme mise a jour',
  message: `Alarme #${alarm.id} est maintenant ${alarm.lifecycleStatus}.`,
  time: 'a l instant',
  read: false,
});

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastQueue, setToastQueue] = useState<BackendAlarm[]>([]);
  const [activeToast, setActiveToast] = useState<BackendAlarm | null>(null);
  const hasRequestedBrowserPermission = useRef(false);

  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      const [first, ...rest] = toastQueue;
      setActiveToast(first);
      setToastQueue(rest);
    }
  }, [activeToast, toastQueue]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const response = await getNotifications({ page: 1, pageSize: MAX_NOTIFICATIONS, status: 'all' });
        if (!active) {
          return;
        }

        setNotifications(response.data.map(toHeaderItem));
      } catch {
        if (!active) {
          return;
        }
        setNotifications([]);
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const showBrowserNotification = (alarm: BackendAlarm) => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
      }

      const title = `Alarme ${alarm.severity.toUpperCase()} - ${alarm.rtuName || `RTU-${alarm.rtuId || 'N/A'}`}`;
      const body = alarm.message;

      if (Notification.permission === 'granted') {
        new Notification(title, { body });
        return;
      }

      if (Notification.permission === 'default' && !hasRequestedBrowserPermission.current) {
        hasRequestedBrowserPermission.current = true;
        void Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    };

    const onNewAlarm = (rawPayload: unknown) => {
      const alarm = toBackendAlarm(rawPayload);
      setToastQueue((current) => [...current, alarm]);
      showBrowserNotification(alarm);

      window.dispatchEvent(new CustomEvent<BackendAlarm>('nqms:alarm:new', { detail: alarm }));
    };

    const onNewNotification = (rawPayload: unknown) => {
      const notification = toBackendNotification(rawPayload);
      const mapped = toHeaderItem(notification);

      setNotifications((current) => {
        const filtered = current.filter((item) => item.backendId !== mapped.backendId);
        return [mapped, ...filtered].slice(0, MAX_NOTIFICATIONS);
      });
    };

    const onAlarmUpdated = (rawPayload: unknown) => {
      const alarm = toBackendAlarm(rawPayload);
      setNotifications((current) => [buildUpdateNotification(alarm), ...current].slice(0, MAX_NOTIFICATIONS));
      window.dispatchEvent(new CustomEvent<BackendAlarm>('nqms:alarm:updated', { detail: alarm }));
    };

    socket.on('new_alarm', onNewAlarm);
    socket.on('new_notification', onNewNotification);
    socket.on('alarm_updated', onAlarmUpdated);

    return () => {
      socket.off('new_alarm', onNewAlarm);
      socket.off('new_notification', onNewNotification);
      socket.off('alarm_updated', onAlarmUpdated);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const handleToggleMobile = () => {
    setMobileOpen((previous) => !previous);
  };

  const handleCloseMobile = () => {
    setMobileOpen(false);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 8% -5%, rgba(106, 217, 255, 0.25), transparent 30%), radial-gradient(circle at 92% 8%, rgba(243, 169, 201, 0.18), transparent 26%), linear-gradient(145deg, #10182d 0%, #151f39 45%, #1a2643 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(154, 185, 164, 0.24), rgba(154, 185, 164, 0))',
          top: -120,
          right: -120,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(126, 165, 232, 0.22), rgba(126, 165, 232, 0))',
          left: -150,
          bottom: -180,
          pointerEvents: 'none',
        },
      }}
    >
      <Sidebar drawerWidth={DRAWER_WIDTH} mobileOpen={mobileOpen} onMobileClose={handleCloseMobile} />

      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Header
          drawerWidth={DRAWER_WIDTH}
          onMenuClick={handleToggleMobile}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
        <FloatingChatbot />
      </Box>

      {activeToast ? <AlarmNotification alarm={activeToast} onClose={() => setActiveToast(null)} /> : null}
    </Box>
  );
};

export default MainLayout;
