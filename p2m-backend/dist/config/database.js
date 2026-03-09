"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = exports.databaseState = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME || 'p2m_dashboard', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD || '', {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
exports.databaseState = {
    connected: false,
    lastError: null,
};
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        exports.databaseState.connected = true;
        exports.databaseState.lastError = null;
        console.log('✅ PostgreSQL connected successfully');
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✅ Database schema synced');
        return true;
    }
    catch (error) {
        exports.databaseState.connected = false;
        exports.databaseState.lastError = error instanceof Error ? error.message : 'Unknown database error';
        console.warn('⚠️ PostgreSQL connection failed, starting API in degraded mode');
        console.warn(`   Reason: ${exports.databaseState.lastError}`);
        return false;
    }
};
exports.connectDatabase = connectDatabase;
exports.default = sequelize;
