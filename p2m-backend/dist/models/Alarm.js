"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Alarm extends sequelize_1.Model {
}
Alarm.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    rtuId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'rtu_id',
    },
    fibreId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'fibre_id',
    },
    routeId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'route_id',
    },
    alarmType: {
        type: sequelize_1.DataTypes.ENUM('Fiber Cut', 'High Loss', 'RTU Down', 'Temperature', 'Maintenance'),
        allowNull: false,
        field: 'alarm_type',
    },
    severity: {
        type: sequelize_1.DataTypes.ENUM('critical', 'major', 'minor', 'info'),
        allowNull: false,
    },
    lifecycleStatus: {
        type: sequelize_1.DataTypes.ENUM('active', 'acknowledged', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'active',
        field: 'lifecycle_status',
    },
    resolutionComment: {
        type: sequelize_1.DataTypes.STRING(400),
        allowNull: true,
        field: 'resolution_comment',
    },
    message: {
        type: sequelize_1.DataTypes.STRING(400),
        allowNull: false,
    },
    location: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    localizationKm: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        field: 'localization_km',
    },
    owner: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    occurredAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'occurred_at',
    },
    acknowledgedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'acknowledged_at',
    },
    resolvedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'resolved_at',
    },
}, {
    sequelize: database_1.default,
    modelName: 'Alarm',
    tableName: 'alarms',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = Alarm;
