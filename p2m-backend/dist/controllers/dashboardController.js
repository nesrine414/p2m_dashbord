"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteAttenuationTrend = exports.getRecentOtdrTests = exports.getTopology = exports.getDashboardStats = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const dashboardStatsService_1 = require("../services/dashboardStatsService");
const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'];
const RESOLVED_ALARM_LIFECYCLE_STATUSES = ['resolved', 'closed', 'cleared'];
const DEFAULT_TREND_WINDOW_MINUTES = 180;
const DEFAULT_TREND_LIMIT = 120;
const ROUTE_TARGETS_BY_SOURCE = {
    1: [6, 2, 5],
    2: [1, 3],
    3: [2, 4],
    4: [3, 5],
    5: [4],
    6: [1, 2],
};
const buildRouteName = (sourceName, destinationName, fibreName) => {
    if (fibreName) {
        return `${sourceName} -> ${destinationName} (${fibreName})`;
    }
    return `${sourceName}-${destinationName}`;
};
const buildRouteStatus = (status) => {
    if (status === 'broken') {
        return 'inactive';
    }
    if (status === 'degraded') {
        return 'skipped';
    }
    return 'active';
};
const pickDestinationRtuId = (sourceRtuId, fibreName, availableRtuIds) => {
    const fiberOrdinal = Math.max(1, Number((fibreName || '').replace(/\D+/g, '')) || 1);
    const configuredTargets = ROUTE_TARGETS_BY_SOURCE[sourceRtuId] || [];
    const configuredTargetId = configuredTargets.length > 0 ? configuredTargets[(fiberOrdinal - 1) % configuredTargets.length] : undefined;
    if (configuredTargetId && configuredTargetId !== sourceRtuId && availableRtuIds.includes(configuredTargetId)) {
        return configuredTargetId;
    }
    if (availableRtuIds.length === 0) {
        return null;
    }
    const sourceIndex = availableRtuIds.indexOf(sourceRtuId);
    const fallbackIndex = sourceIndex >= 0 ? sourceIndex : 0;
    let candidate = availableRtuIds[(fallbackIndex + fiberOrdinal) % availableRtuIds.length];
    if (candidate === sourceRtuId) {
        candidate = availableRtuIds[(fallbackIndex + fiberOrdinal + 1) % availableRtuIds.length];
    }
    if (candidate === sourceRtuId) {
        return null;
    }
    return candidate;
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
const buildFibrePath = (sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude) => {
    const sourceLat = Number(sourceLatitude);
    const sourceLon = Number(sourceLongitude);
    const destLat = Number(destinationLatitude);
    const destLon = Number(destinationLongitude);
    if (!Number.isFinite(sourceLat) ||
        !Number.isFinite(sourceLon) ||
        !Number.isFinite(destLat) ||
        !Number.isFinite(destLon)) {
        return null;
    }
    return [
        [Number(sourceLat.toFixed(6)), Number(sourceLon.toFixed(6))],
        [Number(destLat.toFixed(6)), Number(destLon.toFixed(6))],
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
    const validDurationsHours = resolvedAlarms
        .map((alarm) => {
        if (!alarm.resolvedAt || !alarm.occurredAt) {
            return null;
        }
        const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0) {
            return null;
        }
        return diffMs / (1000 * 60 * 60);
    })
        .filter((duration) => typeof duration === 'number');
    if (validDurationsHours.length === 0) {
        return 0;
    }
    const totalHours = validDurationsHours.reduce((acc, value) => acc + value, 0);
    return Number((totalHours / validDurationsHours.length).toFixed(4));
};
const parseBoundedNumber = (value, fallback, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.floor(parsed)));
};
const getTrendStartTimestamp = (windowMinutes) => {
    if (windowMinutes === 24 * 60) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return start;
    }
    if (windowMinutes === 7 * 24 * 60) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
        return start;
    }
    return new Date(Date.now() - windowMinutes * 60000);
};
const calculateAverageAttenuation = async () => {
    const measurements = await models_1.Measurement.findAll({
        order: [['timestamp', 'DESC']],
        attributes: ['fibreId', 'attenuation'],
    });
    const latestByFibre = new Map();
    measurements.forEach((measurement) => {
        const fibreId = measurement.get('fibreId');
        const attenuation = measurement.get('attenuation');
        if (latestByFibre.has(fibreId)) {
            return;
        }
        if (typeof attenuation === 'number' && attenuation > 0) {
            latestByFibre.set(fibreId, attenuation);
        }
    });
    if (latestByFibre.size === 0) {
        return 0;
    }
    const sum = Array.from(latestByFibre.values()).reduce((acc, value) => acc + value, 0);
    return Number((sum / latestByFibre.size).toFixed(1));
};
const calculateEstimatedMTBF = async (rtuTotal) => {
    const [openAlarmCount, degradedOrBrokenFibres, measurements] = await Promise.all([
        models_1.Alarm.count({
            where: {
                lifecycleStatus: { [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES },
            },
        }),
        models_1.Fibre.count({
            where: {
                status: { [sequelize_1.Op.in]: ['degraded', 'broken'] },
            },
        }),
        models_1.Measurement.findAll({
            order: [['timestamp', 'DESC']],
            attributes: ['fibreId', 'testResult'],
        }),
    ]);
    const latestByFibre = new Map();
    measurements.forEach((measurement) => {
        const fibreId = measurement.get('fibreId');
        if (latestByFibre.has(fibreId)) {
            return;
        }
        latestByFibre.set(fibreId, measurement.get('testResult') ?? null);
    });
    const failedLatestTests = Array.from(latestByFibre.values()).filter((result) => result === 'fail').length;
    const incidentLoad = Math.max(1, openAlarmCount + degradedOrBrokenFibres + failedLatestTests);
    const networkScale = Math.max(1, rtuTotal);
    return Number(((networkScale * 168) / incidentLoad).toFixed(1));
};
const getDashboardStats = async (_req, res) => {
    try {
        const stats = await (0, dashboardStatsService_1.getDashboardStatsSnapshot)();
        res.json(stats);
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
        const [fibres, measurements, rtus] = await Promise.all([
            models_1.Fibre.findAll({
                include: [{ model: models_1.RTU, as: 'rtu', attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'] }],
                order: [['id', 'ASC']],
            }),
            models_1.Measurement.findAll({ order: [['timestamp', 'DESC']] }),
            models_1.RTU.findAll({
                attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'],
                order: [['id', 'ASC']],
            }),
        ]);
        const latestMeasurementByFibre = new Map();
        measurements.forEach((measurement) => {
            const fibreId = measurement.get('fibreId');
            if (!latestMeasurementByFibre.has(fibreId)) {
                latestMeasurementByFibre.set(fibreId, measurement);
            }
        });
        const availableRtuIds = rtus.map((rtu) => rtu.get('id'));
        const rtuById = new Map();
        rtus.forEach((rtu) => {
            rtuById.set(rtu.get('id'), rtu);
        });
        const routes = fibres.map((fibre, index) => {
            const rtu = fibre.get('rtu');
            const latestMeasurement = latestMeasurementByFibre.get(fibre.get('id'));
            const fibreName = fibre.get('name');
            const sourceRtu = rtu || rtuById.get(fibre.get('rtuId'));
            const sourceRtuId = sourceRtu ? sourceRtu.get('id') : null;
            const destinationRtuId = sourceRtuId !== null ? pickDestinationRtuId(sourceRtuId, fibreName, availableRtuIds) : null;
            const destinationRtu = destinationRtuId !== null ? rtuById.get(destinationRtuId) || null : null;
            const sourceName = sourceRtu ? (sourceRtu.get('name') || `RTU-${fibre.get('rtuId')}`) : `RTU-${fibre.get('rtuId')}`;
            const destinationName = destinationRtu
                ? (destinationRtu.get('name') || `RTU-${destinationRtuId}`)
                : `RTU-${destinationRtuId ?? index + 1}`;
            const routeName = buildRouteName(sourceName, destinationName, fibreName);
            return {
                id: fibre.get('id'),
                routeName,
                source: sourceName,
                destination: destinationName,
                sourceRtuId,
                destinationRtuId,
                fiberStatus: fibre.get('status'),
                routeStatus: buildRouteStatus(fibre.get('status')),
                path: sourceRtu && destinationRtu
                    ? buildFibrePath(sourceRtu.get('locationLatitude'), sourceRtu.get('locationLongitude'), destinationRtu.get('locationLatitude'), destinationRtu.get('locationLongitude'))
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
const getRouteAttenuationTrend = async (req, res) => {
    try {
        const routeId = Number(req.params.routeId);
        if (!Number.isFinite(routeId) || routeId <= 0) {
            res.status(400).json({ error: 'Invalid route id' });
            return;
        }
        const query = req.query;
        const windowMinutes = parseBoundedNumber(query.windowMinutes, DEFAULT_TREND_WINDOW_MINUTES, 5, 7 * 24 * 60);
        const limit = parseBoundedNumber(query.limit, DEFAULT_TREND_LIMIT, 10, 5000);
        const fromTimestamp = getTrendStartTimestamp(windowMinutes);
        if (!database_1.databaseState.connected) {
            const route = demoData_1.demoFiberRoutes.find((item) => item.id === routeId);
            if (!route) {
                res.status(404).json({ error: 'Route not found' });
                return;
            }
            const points = demoData_1.demoMeasurements
                .filter((measurement) => measurement.fibreId === routeId)
                .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
                .slice(-limit)
                .map((measurement) => ({
                timestamp: measurement.timestamp,
                attenuationDb: measurement.attenuation,
                wavelengthNm: measurement.wavelength,
                testResult: measurement.testResult,
            }));
            res.json({
                routeId: route.id,
                routeName: route.routeName,
                source: route.source,
                destination: route.destination,
                windowMinutes,
                sampledAt: new Date().toISOString(),
                points,
                degradedMode: true,
            });
            return;
        }
        const fibre = await models_1.Fibre.findByPk(routeId, {
            include: [{ model: models_1.RTU, as: 'rtu', attributes: ['id', 'name'] }],
        });
        if (!fibre) {
            res.status(404).json({ error: 'Route not found' });
            return;
        }
        const sourceRtu = fibre.get('rtu');
        const sourceName = sourceRtu ? (sourceRtu.get('name') || `RTU-${fibre.get('rtuId')}`) : `RTU-${fibre.get('rtuId')}`;
        const destinationName = fibre.get('name') || `Fibre-${fibre.get('id')}`;
        const routeName = buildRouteName(sourceName, destinationName, fibre.get('name'));
        const measurements = await models_1.Measurement.findAll({
            where: {
                fibreId: routeId,
                timestamp: {
                    [sequelize_1.Op.gte]: fromTimestamp,
                },
            },
            order: [['timestamp', 'DESC']],
            limit,
        });
        const points = measurements
            .slice()
            .reverse()
            .map((measurement) => ({
            timestamp: measurement.get('timestamp'),
            attenuationDb: measurement.get('attenuation') ?? null,
            wavelengthNm: Number(measurement.get('wavelength')),
            testResult: measurement.get('testResult'),
        }));
        res.json({
            routeId,
            routeName,
            source: sourceName,
            destination: destinationName,
            windowMinutes,
            sampledAt: new Date().toISOString(),
            points,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch attenuation trend' });
    }
};
exports.getRouteAttenuationTrend = getRouteAttenuationTrend;
