import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const databaseName = process.env.DB_NAME || 'p2m_dashboard';
const databaseUser = process.env.DB_USER || 'postgres';
const databasePassword = process.env.DB_PASSWORD || '';
const databaseHost = process.env.DB_HOST || 'localhost';
const databasePort = Number(process.env.DB_PORT || 5432);
const hasDatabasePassword = databasePassword.trim().length > 0;

const sequelize = new Sequelize(
  databaseName,
  databaseUser,
  databasePassword,
  {
    host: databaseHost,
    port: databasePort,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export const databaseState: { connected: boolean; lastError: string | null } = {
  connected: false,
  lastError: null,
};

export const connectDatabase = async (): Promise<boolean> => {
  if (!hasDatabasePassword) {
    databaseState.connected = false;
    databaseState.lastError = 'DB_PASSWORD is missing or empty';
    console.warn('⚠️ PostgreSQL config is incomplete, starting API in degraded mode');
    console.warn(`   Reason: ${databaseState.lastError}`);
    return false;
  }

  try {
    await sequelize.authenticate();
    databaseState.connected = true;
    databaseState.lastError = null;
    console.log('✅ PostgreSQL connected successfully');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database schema synced');
    return true;
  } catch (error) {
    databaseState.connected = false;
    databaseState.lastError = error instanceof Error ? error.message : 'Unknown database error';
    console.warn('⚠️ PostgreSQL connection failed, starting API in degraded mode');
    console.warn(`   Reason: ${databaseState.lastError}`);
    return false;
  }
};

export default sequelize;
