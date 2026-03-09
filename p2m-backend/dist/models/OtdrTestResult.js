"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class OtdrTestResult extends sequelize_1.Model {
}
OtdrTestResult.init({
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
    routeId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: 'route_id',
    },
    mode: {
        type: sequelize_1.DataTypes.ENUM('auto', 'manual', 'scheduled'),
        allowNull: false,
    },
    pulseWidth: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: 'pulse_width',
    },
    dynamicRangeDb: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        field: 'dynamic_range_db',
    },
    wavelengthNm: {
        type: sequelize_1.DataTypes.ENUM('1310', '1550', '1625'),
        allowNull: false,
        field: 'wavelength_nm',
        get() {
            const raw = this.getDataValue('wavelengthNm');
            return Number(raw);
        },
        set(value) {
            this.setDataValue('wavelengthNm', String(value));
        },
    },
    result: {
        type: sequelize_1.DataTypes.ENUM('pass', 'fail'),
        allowNull: false,
    },
    testedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'tested_at',
    },
}, {
    sequelize: database_1.default,
    modelName: 'OtdrTestResult',
    tableName: 'otdr_test_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = OtdrTestResult;
