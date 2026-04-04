"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentOtdrTests = exports.getTopology = exports.getDashboardStats = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'];
const RESOLVED_ALARM_LIFECYCLE_STATUSES = ['resolved', 'closed', 'cleared'];
const FIBRE_OFFSETS = [
    [0.0, 0.018],
    [0.014, 0.012],
    [0.018, 0.0],
    [0.014, -0.012],
    [0.0, -0.018],
    [-0.014, -0.012],
    [-0.018, 0.0],
    [-0.014, 0.012],
];
const buildRouteName = (rtuName, fibreName) => `${rtuName}-${fibreName}`;
const buildRouteStatus = (status) => {
    if (status === 'broken') {
        return 'inactive';
    }
    if (status === 'degraded') {
        return 'skipped';
    }
    return 'active';
};
const buildPulseWidth = (length) => {
    if (!length || length <= 0) {
        return '30 ns';
    }
    if (length >= 30) {
        return '100 ns';
    }
    if (length >= 20) {
        return '50 ns';
    }
    return '30 ns';
};
const buildMeasurementMode = (result, wavelength) => {
    if (result === 'fail') {
        return 'manual';
    }
    if (wavelength === 1625) {
        return 'scheduled';
    }
    return 'auto';
};
const buildFibrePath = (latitude, longitude, fibreName) => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
    }
    const fibreIndex = Math.max(0, Number((fibreName || '').replace(/\D+/g, '')) - 1) % FIBRE_OFFSETS.length;
    const [latOffset, lonOffset] = FIBRE_OFFSETS[fibreIndex];
    return [
        [lat, lon],
        [Number((lat + latOffset).toFixed(6)), Number((lon + lonOffset).toFixed(6))],
    ];
};
const calculateMTTR = async () => {
    const resolvedAlarms = await models_1.Alarm.findAll({
        where: {
            lifecycleStatus: {
                [sequelize_1.Op.in]: RESOLVED_ALARM_LIFECYCLE_STATUSES,
            },
        },
    });
    if (resolvedAlarms.length === 0) {
        return 0;
    }
    const totalHours = resolvedAlarms.reduce((acc, alarm) => {
        if (!alarm.resolvedAt || !alarm.occurredAt) {
            return acc;
        }
        const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
        return acc + diffMs / (1000 * 60 * 60);
    }, 0);
    return Number((totalHours / resolvedAlarms.length).toFixed(2));
};
const getDashboardStats = async (_req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            const rtuOnline = demoData_1.demoRtus.filter((item) => item.status === 'online').length;
            const rtuOffline = demoData_1.demoRtus.filter((item) => item.status === 'offline').length;
            const rtuWarning = demoData_1.demoRtus.filter((item) => item.status === 'warning').length;
            const rtuUnreachable = demoData_1.demoRtus.filter((item) => item.status === 'unreachable').length;
            const rtuTotal = demoData_1.demoRtus.length;
            const criticalAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'critical' &&
                OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus)).length;
            const majorAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'major' &&
                OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus)).length;
            const minorAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'minor' &&
                OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus)).length;
            const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
            res.json({
                rtuOnline,
                rtuOffline,
                rtuWarning,
                rtuUnreachable,
                rtuTotal,
                criticalAlarms,
                majorAlarms,
                minorAlarms,
                mttr: 2.4,
                availability,
                degradedMode: true,
            });
            return;
        }
        const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable, criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
            models_1.RTU.count({ where: { status: 'online' } }),
            models_1.RTU.count({ where: { status: 'offline' } }),
            models_1.RTU.count({ where: { status: 'warning' } }),
            models_1.RTU.count({ where: { status: 'unreachable' } }),
            models_1.Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
            models_1.Alarm.count({ where: { severity: 'major', lifecycleStatus: { [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
            models_1.Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
        ]);
        const rtuTotal = rtuOnline + rtuOffline + rtuWarning + rtuUnreachable;
        const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
        const mttr = await calculateMTTR();
        res.json({
            rtuOnline,
            rtuOffline,
            rtuWarning,
            rtuUnreachable,
            rtuTotal,
            criticalAlarms,
            majorAlarms,
            minorAlarms,
            mttr,
            availability,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getTopology = async (_req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.json({ routes: demoData_1.demoFiberRoutes, degradedMode: true });
            return;
        }
        const [fibres, measurements] = await Promise.all([
            models_1.Fibre.findAll({
                include: [{ model: models_1.RTU, as: 'rtu', attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'] }],
                order: [['id', 'ASC']],
            }),
            models_1.Measurement.findAll({ order: [['timestamp', 'DESC']] }),
        ]);
        const latestMeasurementByFibre = new Map();
        measurements.forEach((measurement) => {
            const fibreId = measurement.get('fibreId');
            if (!latestMeasurementByFibre.has(fibreId)) {
                latestMeasurementByFibre.set(fibreId, measurement);
            }
        });
        const routes = fibres.map((fibre) => {
            const rtu = fibre.get('rtu');
            const latestMeasurement = latestMeasurementByFibre.get(fibre.get('id'));
            const fibreName = fibre.get('name');
            const routeName = buildRouteName(rtu ? (rtu.get('name') || `RTU-${fibre.get('rtuId')}`) : `RTU-${fibre.get('rtuId')}`, fibreName);
            return {
                id: fibre.get('id'),
                routeName,
                source: rtu ? (rtu.get('locationAddress') || rtu.get('name')) : routeName,
                destination: `Fibre ${fibreName}`,
                fiberStatus: fibre.get('status'),
                routeStatus: buildRouteStatus(fibre.get('status')),
                path: rtu
                    ? buildFibrePath(rtu.get('locationLatitude'), rtu.get('locationLongitude'), fibreName)
                    : null,
                lengthKm: fibre.get('length') ?? null,
                attenuationDb: latestMeasurement ? (latestMeasurement.get('attenuation') ?? null) : null,
                reflectionEvents: latestMeasurement ? latestMeasurement.get('testResult') === 'fail' : false,
                lastTestTime: latestMeasurement ? latestMeasurement.get('timestamp') : null,
            };
        });
        res.json({ routes });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch topology' });
    }
};
exports.getTopology = getTopology;
const getRecentOtdrTests = async (_req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            const tests = demoData_1.demoOtdrTests.map((test) => {
                const route = demoData_1.demoFiberRoutes.find((item) => item.id === test.routeId);
                return {
                    ...test,
                    routeName: route?.routeName || 'Unknown',
                };
            });
            res.json({ data: tests, degradedMode: true });
            return;
        }
        const tests = await models_1.Measurement.findAll({
            include: [
                {
                    model: models_1.Fibre,
                    as: 'fibre',
                    attributes: ['id', 'name', 'length', 'rtuId'],
                    include: [{ model: models_1.RTU, as: 'rtu', attributes: ['id', 'name'] }],
                },
            ],
            order: [['timestamp', 'DESC']],
            limit: 20,
        });
        const mapped = tests.map((test) => {
            const fibre = test.get('fibre');
            const rtu = fibre?.get('rtu');
            const routeName = fibre
                ? buildRouteName(rtu ? (rtu.get('name') || `RTU-${fibre.get('rtuId')}`) : `RTU-${fibre.get('rtuId')}`, fibre.get('name') || 'Fibre')
                : 'Unknown';
            const attenuation = test.get('attenuation') ?? null;
            const wavelength = test.get('wavelength');
            return {
                id: test.get('id'),
                mode: buildMeasurementMode(test.get('testResult'), wavelength),
                pulseWidth: buildPulseWidth(fibre?.get('length') ?? null),
                dynamicRangeDb: attenuation !== null ? Number((attenuation + 12).toFixed(1)) : null,
                wavelengthNm: wavelength,
                result: test.get('testResult'),
                testedAt: test.get('timestamp'),
                routeId: fibre ? fibre.get('id') : null,
                routeName,
            };
        });
        res.json({ data: mapped });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch OTDR tests' });
    }
};
exports.getRecentOtdrTests = getRecentOtdrTests;
