"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class FiberRoute extends sequelize_1.Model {
}
FiberRoute.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    routeName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'route_name',
    },
    source: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    destination: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    fiberStatus: {
        type: sequelize_1.DataTypes.ENUM('normal', 'degraded', 'broken'),
        allowNull: false,
        defaultValue: 'normal',
        field: 'fiber_status',
    },
    routeStatus: {
        type: sequelize_1.DataTypes.ENUM('active', 'inactive', 'skipped'),
        allowNull: false,
        defaultValue: 'active',
        field: 'route_status',
    },
    lengthKm: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        field: 'length_km',
    },
    attenuationDb: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        field: 'attenuation_db',
    },
    reflectionEvents: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'reflection_events',
    },
    lastTestTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: 'last_test_time',
    },
}, {
    sequelize: database_1.default,
    modelName: 'FiberRoute',
    tableName: 'fiber_routes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = FiberRoute;
