import http from 'http';
import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDatabase, databaseState } from './config/database';
import './models';
import { Alarm, FiberRoute, OtdrTestResult, RTU, User } from './models';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from './data/demoData';
import routes from './routes';
import { initWebSocket } from './utils/websocket';
import { startAlarmDetection } from './services/cronJobs';

dotenv.config();

const app: Application = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'NQMS Backend API - Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    databaseConnected: databaseState.connected,
    databaseError: databaseState.lastError,
  });
});

app.use('/api', routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const seedDefaultData = async (): Promise<void> => {
  const userCount = await User.count();
  if (userCount === 0) {
    const password = await bcrypt.hash('Admin@1234', 10);
    await User.create({
      username: 'admin',
      password,
      email: 'admin@nqms.local',
      role: 'admin',
      firstName: 'System',
      lastName: 'Admin',
    });
    console.log('Seeded default admin user (admin / Admin@1234)');
  }

  const rtuCount = await RTU.count();
  if (rtuCount < demoRtus.length) {
    await RTU.bulkCreate(
      demoRtus.map((rtu) => ({
        ...rtu,
        lastSeen: new Date(rtu.lastSeen),
      })),
      { ignoreDuplicates: true }
    );
    console.log('Seeded Tunisia RTU demo inventory');
  }

  const fiberRouteCount = await FiberRoute.count();
  if (fiberRouteCount < demoFiberRoutes.length) {
    await FiberRoute.bulkCreate(
      demoFiberRoutes.map(({ path: _path, ...route }) => ({
        ...route,
        lastTestTime: new Date(route.lastTestTime),
      })),
      { ignoreDuplicates: true }
    );
    console.log('Seeded Tunisia fiber route demo data');
  }

  const alarmCount = await Alarm.count();
  if (alarmCount === 0) {
    await Alarm.bulkCreate(
      demoAlarms.map((alarm) => ({
        ...alarm,
        occurredAt: new Date(alarm.occurredAt),
      }))
    );
    console.log('Seeded alarm demo data');
  }

  const otdrCount = await OtdrTestResult.count();
  if (otdrCount === 0) {
    await OtdrTestResult.bulkCreate(
      demoOtdrTests.map((test) => ({
        ...test,
        testedAt: new Date(test.testedAt),
      }))
    );
    console.log('Seeded OTDR demo data');
  }
};

const startServer = async (): Promise<void> => {
  try {
    const dbConnected = await connectDatabase();
    if (dbConnected) {
      await seedDefaultData();
    }

    initWebSocket(server);
    startAlarmDetection();

    server.listen(PORT, () => {
      console.log(`\nServer started on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`WebSocket ready on ws://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
