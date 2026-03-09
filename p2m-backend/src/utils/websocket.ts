import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

let io: Server | null = null;

export const initWebSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
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
