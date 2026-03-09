"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class User extends sequelize_1.Model {
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('admin', 'user', 'customer'),
        allowNull: false,
        defaultValue: 'user',
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: 'first_name',
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: 'last_name',
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = User;
