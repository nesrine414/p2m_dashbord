"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class ReportJob extends sequelize_1.Model {
}
ReportJob.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false,
    },
    period: {
        type: sequelize_1.DataTypes.STRING(80),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('queued', 'running', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'queued',
    },
    outputPath: {
        type: sequelize_1.DataTypes.STRING(400),
        allowNull: true,
        field: 'output_path',
    },
    requestedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'requested_by',
    },
    generatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'generated_at',
    },
}, {
    sequelize: database_1.default,
    modelName: 'ReportJob',
    tableName: 'report_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = ReportJob;
