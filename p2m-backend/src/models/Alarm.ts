import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AlarmAttributes {
  id: number;
  rtuId?: number;
  routeId?: number;
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  severity: 'critical' | 'major' | 'minor' | 'info';
  lifecycleStatus: 'active' | 'acknowledged' | 'cleared';
  message: string;
  location?: string;
  localizationKm?: string;
  owner?: string;
  occurredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  created_at?: Date;
  updated_at?: Date;
}

type AlarmCreationAttributes = Optional<AlarmAttributes, 'id' | 'lifecycleStatus' | 'occurredAt'>;

class Alarm extends Model<AlarmAttributes, AlarmCreationAttributes> implements AlarmAttributes {
  declare id: number;
  declare rtuId?: number;
  declare routeId?: number;
  declare alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  declare severity: 'critical' | 'major' | 'minor' | 'info';
  declare lifecycleStatus: 'active' | 'acknowledged' | 'cleared';
  declare message: string;
  declare location?: string;
  declare localizationKm?: string;
  declare owner?: string;
  declare occurredAt: Date;
  declare acknowledgedAt?: Date;
  declare resolvedAt?: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Alarm.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rtuId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'rtu_id',
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'route_id',
    },
    alarmType: {
      type: DataTypes.ENUM('Fiber Cut', 'High Loss', 'RTU Down', 'Temperature', 'Maintenance'),
      allowNull: false,
      field: 'alarm_type',
    },
    severity: {
      type: DataTypes.ENUM('critical', 'major', 'minor', 'info'),
      allowNull: false,
    },
    lifecycleStatus: {
      type: DataTypes.ENUM('active', 'acknowledged', 'cleared'),
      allowNull: false,
      defaultValue: 'active',
      field: 'lifecycle_status',
    },
    message: {
      type: DataTypes.STRING(400),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    localizationKm: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'localization_km',
    },
    owner: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'occurred_at',
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'acknowledged_at',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
  },
  {
    sequelize,
    modelName: 'Alarm',
    tableName: 'alarms',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Alarm;
