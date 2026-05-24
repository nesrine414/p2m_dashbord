import { Server as HttpServer } from 'http';
import { Op } from 'sequelize';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

let io: Server | null = null;
const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'];

const isAllowedDevOrigin = (origin: string): boolean => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    );
  } catch {
    return false;
  }
};

export const initWebSocket = (httpServer: HttpServer): Server => {
  const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origin === configuredFrontendUrl || isAllowedDevOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`WebSocket CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    void (async () => {
      try {
        const [{ default: Alarm }, { toRealtimeAlarmPayload }] = await Promise.all([
          import('../models/Alarm'),
          import('../services/alarmRealtimeService'),
        ]);

        const openAlarms = await Alarm.findAll({
          where: {
            lifecycleStatus: {
              [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES,
            },
          },
          order: [['occurredAt', 'DESC']],
          limit: 100,
        });

        for (const alarm of openAlarms) {
          socket.emit('alarm_updated', await toRealtimeAlarmPayload(alarm));
        }

        if (openAlarms.length > 0) {
          console.log(`WebSocket replayed ${openAlarms.length} open alarm(s) to ${socket.id}`);
        }
      } catch (error) {
        console.warn(`WebSocket alarm replay failed for ${socket.id}:`, error);
      }
    })();

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

export const emitEvent = <T>(event: string, payload: T): void => {
  if (!io) {
    return;
  }
  io.emit(event, payload);
};
