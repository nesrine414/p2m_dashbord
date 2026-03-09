import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'p2m_dashboard',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
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
  }
);

export const databaseState: { connected: boolean; lastError: string | null } = {
  connected: false,
  lastError: null,
};

export const connectDatabase = async (): Promise<boolean> => {
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
