"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class AuditLog extends sequelize_1.Model {
}
AuditLog.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
    },
    action: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
    },
    entity: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
    },
    entityId: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: true,
        field: 'entity_id',
    },
    metadata: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = AuditLog;
