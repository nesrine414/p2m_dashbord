"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveCriticalAlarms = exports.closeAlarm = exports.resolvedAlarm = exports.inProgressAlarm = exports.resolveAlarm = exports.acknowledgeAlarm = exports.createAlarm = exports.getAlarmById = exports.getAlarms = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const websocket_1 = require("../utils/websocket");
const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'];
const mapDemoAlarm = (alarm) => {
    const rtu = demoData_1.demoRtus.find((item) => item.id === alarm.rtuId);
    return {
        ...alarm,
        rtuName: rtu?.name || 'Unknown RTU',
        zone: rtu?.locationAddress || alarm.location,
    };
};
const mapDbAlarm = (alarm, rtu) => ({
    id: alarm.get('id'),
    rtuId: alarm.get('rtuId') ?? null,
    fibreId: alarm.get('fibreId') ?? null,
    routeId: alarm.get('routeId') ?? null,
    rtuName: rtu ? (rtu.get('name') || 'Unknown RTU') : 'Unknown RTU',
    zone: rtu ? (rtu.get('locationAddress') || 'Unknown zone') : 'Unknown zone',
    severity: alarm.get('severity'),
    lifecycleStatus: alarm.get('lifecycleStatus'),
    alarmType: alarm.get('alarmType'),
    message: alarm.get('message'),
    location: alarm.get('location') || null,
    localizationKm: alarm.get('localizationKm') || null,
    owner: alarm.get('owner') || null,
    occurredAt: alarm.get('occurredAt'),
    acknowledgedAt: alarm.get('acknowledgedAt') || null,
    resolvedAt: alarm.get('resolvedAt') || null,
});
const resolveAlarmRtu = async (alarm) => {
    const alarmRtuId = alarm.get('rtuId') ?? null;
    if (alarmRtuId) {
        return models_1.RTU.findByPk(alarmRtuId);
    }
    const fibreId = alarm.get('fibreId') ?? null;
    if (!fibreId) {
        return null;
    }
    const fibre = await models_1.Fibre.findByPk(fibreId);
    const rtuId = fibre?.get('rtuId') ?? null;
    return rtuId ? models_1.RTU.findByPk(rtuId) : null;
};
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
            const paged = filtered.slice(offset, offset + size).map(mapDemoAlarm);
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
        if (severity) {
            whereClause.severity = severity;
        }
        if (status) {
            whereClause.lifecycleStatus = status;
        }
        if (rtuId) {
            const fibreIds = await models_1.Fibre.findAll({
                where: { rtuId: Number(rtuId) },
                attributes: ['id'],
            });
            whereClause[sequelize_1.Op.or] = [
                { rtuId: Number(rtuId) },
                { fibreId: { [sequelize_1.Op.in]: fibreIds.map((item) => item.get('id')) } },
            ];
        }
        const { rows, count } = await models_1.Alarm.findAndCountAll({
            where: whereClause,
            order: [['occurredAt', 'DESC']],
            limit: size,
            offset,
        });
        const mapped = await Promise.all(rows.map(async (alarm) => {
            const rtu = await resolveAlarmRtu(alarm);
            return mapDbAlarm(alarm, rtu);
        }));
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
        const id = Number(req.params.id);
        if (!database_1.databaseState.connected) {
            const alarm = demoData_1.demoAlarms.find((item) => item.id === id);
            if (!alarm) {
                res.status(404).json({ error: 'Alarm not found' });
                return;
            }
            res.json(mapDemoAlarm(alarm));
            return;
        }
        const alarm = await models_1.Alarm.findByPk(id);
        if (!alarm) {
            res.status(404).json({ error: 'Alarm not found' });
            return;
        }
        const rtu = await resolveAlarmRtu(alarm);
        res.json(mapDbAlarm(alarm, rtu));
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
            lifecycleStatus: 'closed',
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
const inProgressAlarm = async (req, res) => {
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
            lifecycleStatus: 'in_progress',
            owner: req.body.owner || alarm.owner,
        });
        (0, websocket_1.emitEvent)('alarm_updated', alarm);
        res.json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to mark alarm in progress' });
    }
};
exports.inProgressAlarm = inProgressAlarm;
const resolvedAlarm = async (req, res) => {
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
            lifecycleStatus: 'resolved',
            resolvedAt: new Date(),
            resolutionComment: req.body.comment || undefined,
            owner: req.body.owner || alarm.owner,
        });
        (0, websocket_1.emitEvent)('alarm_updated', alarm);
        res.json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to resolve alarm' });
    }
};
exports.resolvedAlarm = resolvedAlarm;
const closeAlarm = async (req, res) => {
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
            lifecycleStatus: 'closed',
            owner: req.body.owner || alarm.owner,
        });
        (0, websocket_1.emitEvent)('alarm_updated', alarm);
        res.json(alarm);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to close alarm' });
    }
};
exports.closeAlarm = closeAlarm;
const getActiveCriticalAlarms = async () => models_1.Alarm.count({
    where: {
        severity: 'critical',
        lifecycleStatus: { [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES },
    },
});
exports.getActiveCriticalAlarms = getActiveCriticalAlarms;
