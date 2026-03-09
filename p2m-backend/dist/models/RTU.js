"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class RTU extends sequelize_1.Model {
}
RTU.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    locationLatitude: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'location_latitude',
    },
    locationLongitude: {
        type: sequelize_1.DataTypes.DECIMAL(10, 7),
        allowNull: true,
        field: 'location_longitude',
    },
    locationAddress: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: 'location_address',
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address',
    },
    serialNumber: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        field: 'serial_number',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('online', 'offline', 'warning', 'unreachable'),
        allowNull: false,
        defaultValue: 'online',
    },
    temperature: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    installationDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'installation_date',
    },
    lastSeen: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'last_seen',
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
    },
}, {
    sequelize: database_1.default,
    modelName: 'RTU',
    tableName: 'rtu',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = RTU;
