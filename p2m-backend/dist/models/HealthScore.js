"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class HealthScore extends sequelize_1.Model {
}
HealthScore.init({
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
    score: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    details: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
    calculatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'calculated_at',
    },
}, {
    sequelize: database_1.default,
    modelName: 'HealthScore',
    tableName: 'health_scores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = HealthScore;
