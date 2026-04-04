"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRTU = exports.updateRTU = exports.createRTU = exports.getRTUById = exports.getRTUs = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const demoData_1 = require("../data/demoData");
const getRTUs = async (req, res) => {
    try {
        const { status, search } = req.query;
        if (!database_1.databaseState.connected) {
            const normalizedSearch = search?.toLowerCase().trim();
            const filtered = demoData_1.demoRtus.filter((item) => {
                const statusMatch = !status || item.status === status;
                const searchMatch = !normalizedSearch ||
                    item.name.toLowerCase().includes(normalizedSearch) ||
                    item.ipAddress.toLowerCase().includes(normalizedSearch) ||
                    item.serialNumber.toLowerCase().includes(normalizedSearch);
                return statusMatch && searchMatch;
            });
            res.json(filtered);
            return;
        }
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { ipAddress: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { serialNumber: { [sequelize_1.Op.iLike]: `%${search}%` } },
            ];
        }
        const rtus = await models_1.RTU.findAll({
            where: whereClause,
            order: [['id', 'ASC']],
        });
        res.json(rtus);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch RTUs' });
    }
};
exports.getRTUs = getRTUs;
const getRTUById = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            const id = Number(req.params.id);
            const rtu = demoData_1.demoRtus.find((item) => item.id === id);
            if (!rtu) {
                res.status(404).json({ error: 'RTU not found' });
                return;
            }
            res.json(rtu);
            return;
        }
        const id = Number(req.params.id);
        const rtu = await models_1.RTU.findByPk(id, {
            include: [
                { model: models_1.Alarm, as: 'alarms' },
                {
                    model: models_1.Fibre,
                    as: 'fibres',
                    include: [{ model: models_1.Measurement, as: 'measurements' }],
                },
                { model: models_1.Prediction, as: 'predictions' },
                { model: models_1.HealthScore, as: 'healthScores' },
                { model: models_1.OtdrTestResult, as: 'otdrTests' },
            ],
        });
        if (!rtu) {
            res.status(404).json({ error: 'RTU not found' });
            return;
        }
        res.json(rtu);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch RTU' });
    }
};
exports.getRTUById = getRTUById;
const createRTU = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const created = await models_1.RTU.create(req.body);
        res.status(201).json(created);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create RTU' });
    }
};
exports.createRTU = createRTU;
const updateRTU = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const id = Number(req.params.id);
        const rtu = await models_1.RTU.findByPk(id);
        if (!rtu) {
            res.status(404).json({ error: 'RTU not found' });
            return;
        }
        await rtu.update(req.body);
        res.json(rtu);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update RTU' });
    }
};
exports.updateRTU = updateRTU;
const deleteRTU = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const id = Number(req.params.id);
        const deleted = await models_1.RTU.destroy({ where: { id } });
        if (!deleted) {
            res.status(404).json({ error: 'RTU not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete RTU' });
    }
};
exports.deleteRTU = deleteRTU;
