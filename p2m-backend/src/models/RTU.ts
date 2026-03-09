import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RTUAttributes {
  id: number;
  name: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationAddress?: string;
  ipAddress?: string;
  serialNumber?: string;
  status: 'online' | 'offline' | 'warning' | 'unreachable';
  temperature?: number;
  installationDate?: Date;
  lastSeen?: Date;
  userId?: number;
  created_at?: Date;
  updated_at?: Date;
}

type RTUCreationAttributes = Optional<RTUAttributes, 'id' | 'status'>;

class RTU extends Model<RTUAttributes, RTUCreationAttributes> implements RTUAttributes {
  declare id: number;
  declare name: string;
  declare locationLatitude?: number;
  declare locationLongitude?: number;
  declare locationAddress?: string;
  declare ipAddress?: string;
  declare serialNumber?: string;
  declare status: 'online' | 'offline' | 'warning' | 'unreachable';
  declare temperature?: number;
  declare installationDate?: Date;
  declare lastSeen?: Date;
  declare userId?: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

RTU.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    locationLatitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      field: 'location_latitude',
    },
    locationLongitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      field: 'location_longitude',
    },
    locationAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'location_address',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    serialNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: 'serial_number',
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'warning', 'unreachable'),
      allowNull: false,
      defaultValue: 'online',
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    installationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'installation_date',
    },
    lastSeen: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_seen',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
  },
  {
    sequelize,
    modelName: 'RTU',
    tableName: 'rtu',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default RTU;
