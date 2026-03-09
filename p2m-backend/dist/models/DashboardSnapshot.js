"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class DashboardSnapshot extends sequelize_1.Model {
}
DashboardSnapshot.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    rtuOnline: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'rtu_online',
    },
    rtuOffline: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'rtu_offline',
    },
    rtuWarning: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'rtu_warning',
    },
    criticalAlarms: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'critical_alarms',
    },
    majorAlarms: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'major_alarms',
    },
    minorAlarms: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'minor_alarms',
    },
    mttrHours: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'mttr_hours',
    },
    mtbfHours: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'mtbf_hours',
    },
    availabilityPercent: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        field: 'availability_percent',
    },
    capturedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'captured_at',
    },
}, {
    sequelize: database_1.default,
    modelName: 'DashboardSnapshot',
    tableName: 'dashboard_snapshots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = DashboardSnapshot;
