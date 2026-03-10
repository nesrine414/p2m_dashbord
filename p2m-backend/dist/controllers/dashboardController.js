"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentOtdrTests = exports.getTopology = exports.getDashboardStats = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const calculateMTTR = async () => {
    const resolvedAlarms = await models_1.Alarm.findAll({
        where: {
            lifecycleStatus: 'cleared',
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
            const criticalAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'critical' && item.lifecycleStatus !== 'cleared').length;
            const majorAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'major' && item.lifecycleStatus !== 'cleared').length;
            const minorAlarms = demoData_1.demoAlarms.filter((item) => item.severity === 'minor' && item.lifecycleStatus !== 'cleared').length;
            const rtuTotal = demoData_1.demoRtus.length;
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
        const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable] = await Promise.all([
            models_1.RTU.count({ where: { status: 'online' } }),
            models_1.RTU.count({ where: { status: 'offline' } }),
            models_1.RTU.count({ where: { status: 'warning' } }),
            models_1.RTU.count({ where: { status: 'unreachable' } }),
        ]);
        const [criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
            models_1.Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [sequelize_1.Op.ne]: 'cleared' } } }),
            models_1.Alarm.count({ where: { severity: 'major', lifecycleStatus: { [sequelize_1.Op.ne]: 'cleared' } } }),
            models_1.Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [sequelize_1.Op.ne]: 'cleared' } } }),
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
        const routes = await models_1.FiberRoute.findAll({
            order: [['id', 'ASC']],
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
        const tests = await models_1.OtdrTestResult.findAll({
            include: [{ model: models_1.FiberRoute, as: 'route', attributes: ['id', 'routeName'] }],
            order: [['testedAt', 'DESC']],
            limit: 20,
        });
        const mapped = tests.map((test) => {
            const route = test.get('route');
            return {
                id: test.get('id'),
                mode: test.get('mode'),
                pulseWidth: test.get('pulseWidth'),
                dynamicRangeDb: test.get('dynamicRangeDb'),
                wavelengthNm: test.get('wavelengthNm'),
                result: test.get('result'),
                testedAt: test.get('testedAt'),
                routeId: test.get('routeId'),
                routeName: route ? route.get('routeName') : 'Unknown',
            };
        });
        res.json({ data: mapped });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch OTDR tests' });
    }
};
exports.getRecentOtdrTests = getRecentOtdrTests;
