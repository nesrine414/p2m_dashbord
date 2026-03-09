"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Prediction extends sequelize_1.Model {
}
Prediction.init({
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
    probability: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    riskLevel: {
        type: sequelize_1.DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        field: 'risk_level',
    },
    horizonHours: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'horizon_hours',
    },
    primaryDriver: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: 'primary_driver',
    },
    predictedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'predicted_at',
    },
    validUntil: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'valid_until',
    },
}, {
    sequelize: database_1.default,
    modelName: 'Prediction',
    tableName: 'predictions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = Prediction;
