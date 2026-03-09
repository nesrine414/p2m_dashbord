"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopology = exports.getDashboardStats = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
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
            res.json({
                rtuOnline: 0,
                rtuOffline: 0,
                rtuWarning: 0,
                rtuUnreachable: 0,
                rtuTotal: 0,
                criticalAlarms: 0,
                majorAlarms: 0,
                minorAlarms: 0,
                mttr: 0,
                availability: 0,
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
            res.json({ routes: [], degradedMode: true });
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
