"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveCriticalAlarms = exports.resolveAlarm = exports.acknowledgeAlarm = exports.createAlarm = exports.getAlarmById = exports.getAlarms = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const websocket_1 = require("../utils/websocket");
const getAlarms = async (req, res) => {
    try {
        const { severity, status, rtuId, page = '1', pageSize = '20', } = req.query;
        const pageNumber = Math.max(Number(page) || 1, 1);
        const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
        const offset = (pageNumber - 1) * size;
        if (!database_1.databaseState.connected) {
            const filtered = demoData_1.demoAlarms
                .filter((alarm) => {
                const severityMatch = !severity || alarm.severity === severity;
                const statusMatch = !status || alarm.lifecycleStatus === status;
                const rtuMatch = !rtuId || alarm.rtuId === Number(rtuId);
                return severityMatch && statusMatch && rtuMatch;
            })
                .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
            const paged = filtered.slice(offset, offset + size).map((alarm) => {
                const rtu = demoData_1.demoRtus.find((item) => item.id === alarm.rtuId);
                return {
                    ...alarm,
                    rtuName: rtu?.name || 'Unknown RTU',
                    zone: rtu?.locationAddress || alarm.location,
                };
            });
            res.json({
                data: paged,
                total: filtered.length,
                page: pageNumber,
                totalPages: Math.ceil(filtered.length / size),
                degradedMode: true,
            });
            return;
        }
        const whereClause = {};
        if (severity)
            whereClause.severity = severity;
        if (status)
            whereClause.lifecycleStatus = status;
        if (rtuId)
            whereClause.rtuId = Number(rtuId);
        const { rows, count } = await models_1.Alarm.findAndCountAll({
            where: whereClause,
            include: [{ model: models_1.RTU, as: 'rtu', attributes: ['id', 'name', 'locationAddress'] }],
            order: [['occurredAt', 'DESC']],
            limit: size,
            offset,
        });
        const mapped = rows.map((alarm) => {
            const rtu = alarm.get('rtu');
            return {
                id: alarm.get('id'),
                rtuId: alarm.get('rtuId'),
                rtuName: rtu ? rtu.get('name') : 'Unknown RTU',
                zone: rtu ? (rtu.get('locationAddress') || 'Unknown zone') : 'Unknown zone',
                severity: alarm.get('severity'),
                lifecycleStatus: alarm.get('lifecycleStatus'),
                alarmType: alarm.get('alarmType'),
                message: alarm.get('message'),
                location: alarm.get('location'),
                localizationKm: alarm.get('localizationKm'),
                owner: alarm.get('owner'),
                occurredAt: alarm.get('occurredAt'),
                acknowledgedAt: alarm.get('acknowledgedAt'),
                resolvedAt: alarm.get('resolvedAt'),
            };
        });
        res.json({
            data: mapped,
            total: count,
            page: pageNumber,
            totalPages: Math.ceil(count / size),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch alarms' });
    }
};
exports.getAlarms = getAlarms;
const getAlarmById = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            const id = Number(req.params.id);
            const alarm = demoData_1.demoAlarms.find((item) => item.id === id);
            if (!alarm) {
                res.status(404).json({ error: 'Alarm not found' });
                return;
            }
            const rtu = demoData_1.demoRtus.find((item) => item.id === alarm.rtuId);
            res.json({
                ...alarm,
                rtuName: rtu?.name || 'Unknown RTU',
                zone: rtu?.locationAddress || alarm.location,
            });
            return;
        }
        const id = Number(req.params.id);
        const alarm = await models_1.Alarm.findByPk(id);
        if (!alarm) {
            res.status(404).json({ error: 'Alarm not found' });
            return;
        }
        res.json(alarm);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch alarm' });
    }
};
exports.getAlarmById = getAlarmById;
const createAlarm = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const payload = {
            ...req.body,
            occurredAt: req.body.occurredAt || new Date(),
        };
        const alarm = await models_1.Alarm.create(payload);
        (0, websocket_1.emitEvent)('new_alarm', alarm);
        res.status(201).json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create alarm' });
    }
};
exports.createAlarm = createAlarm;
const acknowledgeAlarm = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const id = Number(req.params.id);
        const alarm = await models_1.Alarm.findByPk(id);
        if (!alarm) {
            res.status(404).json({ error: 'Alarm not found' });
            return;
        }
        await alarm.update({
            lifecycleStatus: 'acknowledged',
            acknowledgedAt: new Date(),
            owner: req.body.owner || alarm.owner,
        });
        (0, websocket_1.emitEvent)('alarm_updated', alarm);
        res.json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to acknowledge alarm' });
    }
};
exports.acknowledgeAlarm = acknowledgeAlarm;
const resolveAlarm = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const id = Number(req.params.id);
        const alarm = await models_1.Alarm.findByPk(id);
        if (!alarm) {
            res.status(404).json({ error: 'Alarm not found' });
            return;
        }
        await alarm.update({
            lifecycleStatus: 'cleared',
            resolvedAt: new Date(),
            owner: req.body.owner || alarm.owner,
        });
        (0, websocket_1.emitEvent)('alarm_updated', alarm);
        res.json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to resolve alarm' });
    }
};
exports.resolveAlarm = resolveAlarm;
const getActiveCriticalAlarms = async () => {
    return models_1.Alarm.count({
        where: {
            severity: 'critical',
            lifecycleStatus: { [sequelize_1.Op.ne]: 'cleared' },
        },
    });
};
exports.getActiveCriticalAlarms = getActiveCriticalAlarms;
