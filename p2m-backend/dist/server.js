"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("./config/database");
require("./models");
const models_1 = require("./models");
const demoData_1 = require("./data/demoData");
const routes_1 = __importDefault(require("./routes"));
const websocket_1 = require("./utils/websocket");
const cronJobs_1 = require("./services/cronJobs");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = Number(process.env.PORT || 5000);
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/', (_req, res) => {
    res.json({
        message: 'NQMS Backend API - Running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        databaseConnected: database_1.databaseState.connected,
        databaseError: database_1.databaseState.lastError,
    });
});
app.use('/api', routes_1.default);
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const isHealthyBackendRunning = async (port) => {
    return new Promise((resolve) => {
        const request = http_1.default.get({
            hostname: '127.0.0.1',
            port,
            path: '/health',
            timeout: 1500,
        }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            response.on('end', () => {
                if (response.statusCode !== 200) {
                    resolve(false);
                    return;
                }
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    resolve(body.status === 'OK');
                }
                catch {
                    resolve(false);
                }
            });
        });
        request.on('timeout', () => {
            request.destroy();
            resolve(false);
        });
        request.on('error', () => {
            resolve(false);
        });
    });
};
const listenOnPort = async () => {
    await new Promise((resolve, reject) => {
        const onError = (error) => {
            server.off('error', onError);
            reject(error);
        };
        server.once('error', onError);
        server.listen(PORT, () => {
            server.off('error', onError);
            resolve();
        });
    });
};
const seedDefaultData = async () => {
    const userCount = await models_1.User.count();
    if (userCount === 0) {
        const password = await bcrypt_1.default.hash('Admin@1234', 10);
        await models_1.User.create({
            username: 'admin',
            password,
            email: 'admin@nqms.local',
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
        });
        console.log('Seeded default admin user (admin / Admin@1234)');
    }
    for (const rtu of demoData_1.demoRtus) {
        await models_1.RTU.upsert({
            id: rtu.id,
            name: rtu.name,
            locationLatitude: rtu.locationLatitude,
            locationLongitude: rtu.locationLongitude,
            locationAddress: rtu.locationAddress,
            ipAddress: rtu.ipAddress,
            serialNumber: rtu.serialNumber,
            status: rtu.status,
            temperature: rtu.temperature,
            attenuationDb: undefined,
            installationDate: undefined,
            lastSeen: new Date(rtu.lastSeen),
            userId: undefined,
        });
    }
    console.log('Synced Tunisia RTU demo inventory');
    const fiberRouteCount = await models_1.FiberRoute.count();
    if (fiberRouteCount < demoData_1.demoFiberRoutes.length) {
        await models_1.FiberRoute.bulkCreate(demoData_1.demoFiberRoutes.map(({ path: _path, ...route }) => ({
            ...route,
            lastTestTime: new Date(route.lastTestTime),
        })), { ignoreDuplicates: true });
        console.log('Seeded Tunisia fiber route demo data');
    }
    const alarmCount = await models_1.Alarm.count();
    if (alarmCount === 0) {
        await models_1.Alarm.bulkCreate(demoData_1.demoAlarms.map((alarm) => ({
            ...alarm,
            occurredAt: new Date(alarm.occurredAt),
        })));
        console.log('Seeded alarm demo data');
    }
    const otdrCount = await models_1.OtdrTestResult.count();
    if (otdrCount === 0) {
        await models_1.OtdrTestResult.bulkCreate(demoData_1.demoOtdrTests.map((test) => ({
            ...test,
            testedAt: new Date(test.testedAt),
        })));
        console.log('Seeded OTDR demo data');
    }
};
const startServer = async () => {
    try {
        const dbConnected = await (0, database_1.connectDatabase)();
        if (dbConnected) {
            await seedDefaultData();
        }
        await listenOnPort();
        (0, websocket_1.initWebSocket)(server);
        (0, cronJobs_1.startAlarmDetection)();
        console.log(`\nServer started on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        console.log(`WebSocket ready on ws://localhost:${PORT}\n`);
    }
    catch (error) {
        const listenError = error;
        if (listenError.code === 'EADDRINUSE') {
            const alreadyRunning = await isHealthyBackendRunning(PORT);
            if (alreadyRunning) {
                console.warn(`Backend is already running on http://localhost:${PORT}; skipping duplicate startup.`);
                process.exit(0);
            }
            console.error(`Port ${PORT} is already in use. Stop the existing process or change the PORT value.`);
            process.exit(1);
        }
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
