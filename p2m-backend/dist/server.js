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
const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const resetDemoDataOnBoot = process.env.RESET_DEMO_DATA_ON_BOOT === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.RESET_DEMO_DATA_ON_BOOT !== 'false');
const isAllowedDevOrigin = (origin) => {
    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== 'http:' && protocol !== 'https:') {
            return false;
        }
        return (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.'));
    }
    catch {
        return false;
    }
};
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || origin === configuredFrontendUrl || isAllowedDevOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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
    if (resetDemoDataOnBoot) {
        await models_1.Alarm.destroy({ where: {} });
        await models_1.Measurement.destroy({ where: {} });
        await models_1.Performance.destroy({ where: {} });
        await models_1.OtdrTestResult.destroy({ where: {} });
        await models_1.FiberRoute.destroy({ where: {} });
        await models_1.HealthScore.destroy({ where: {} });
        await models_1.Prediction.destroy({ where: {} });
        await models_1.Fibre.destroy({ where: {} });
        await models_1.RTU.destroy({ where: {} });
        console.log('Reset demo operational data on boot');
    }
    await models_1.RTU.bulkCreate(demoData_1.demoRtus.map((rtu) => ({
        id: rtu.id,
        name: rtu.name,
        locationLatitude: rtu.locationLatitude,
        locationLongitude: rtu.locationLongitude,
        locationAddress: rtu.locationAddress,
        ipAddress: rtu.ipAddress,
        serialNumber: rtu.serialNumber,
        status: rtu.status,
        power: rtu.power,
        temperature: rtu.temperature,
        otdrStatus: rtu.otdrStatus,
        attenuationDb: undefined,
        installationDate: undefined,
        lastSeen: new Date(rtu.lastSeen),
        userId: undefined,
    })), { ignoreDuplicates: false });
    console.log('Synced Tunisia RTU demo inventory');
    await models_1.Fibre.bulkCreate(demoData_1.demoFibres, { ignoreDuplicates: false });
    console.log('Seeded fibre demo data');
    await models_1.Measurement.bulkCreate(demoData_1.demoMeasurements.map((measurement) => ({
        id: measurement.id,
        fibreId: measurement.fibreId,
        attenuation: measurement.attenuation,
        testResult: measurement.testResult,
        wavelength: measurement.wavelength,
        timestamp: new Date(measurement.timestamp),
    })), { ignoreDuplicates: false });
    console.log('Seeded measurement demo data');
    await models_1.Performance.bulkCreate(demoData_1.demoPerformances.map((item) => ({
        id: item.id,
        fibreId: item.fibreId,
        mttr: item.mttr,
        mtbf: item.mtbf,
        recordedAt: new Date(item.recordedAt),
    })), { ignoreDuplicates: false });
    console.log('Seeded performance demo data');
    await models_1.FiberRoute.bulkCreate(demoData_1.demoFiberRoutes.map(({ path: _path, ...route }) => ({
        ...route,
        lastTestTime: new Date(route.lastTestTime),
    })), { ignoreDuplicates: false });
    console.log('Seeded Tunisia fiber route demo data');
    await models_1.Alarm.bulkCreate(demoData_1.demoAlarms.map((alarm) => ({
        ...alarm,
        occurredAt: new Date(alarm.occurredAt),
    })));
    console.log('Seeded alarm demo data');
    await models_1.OtdrTestResult.bulkCreate(demoData_1.demoOtdrTests.map((test) => ({
        ...test,
        testedAt: new Date(test.testedAt),
    })));
    console.log('Seeded OTDR demo data');
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
        console.log(`CORS enabled for: ${configuredFrontendUrl} + local dev origins`);
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
