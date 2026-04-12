import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DashboardSnapshotAttributes {
  id: number;
  rtuOnline: number;
  rtuOffline: number;
  rtuWarning: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  mttrHours?: number | null;
  mtbfHours: number;
  availabilityPercent: number;
  capturedAt: Date;
  created_at?: Date;
  updated_at?: Date;
}

type DashboardSnapshotCreationAttributes = Optional<DashboardSnapshotAttributes, 'id' | 'capturedAt'>;

class DashboardSnapshot
  extends Model<DashboardSnapshotAttributes, DashboardSnapshotCreationAttributes>
  implements DashboardSnapshotAttributes
{
  declare id: number;
  declare rtuOnline: number;
  declare rtuOffline: number;
  declare rtuWarning: number;
  declare criticalAlarms: number;
  declare majorAlarms: number;
  declare minorAlarms: number;
  declare mttrHours?: number | null;
  declare mtbfHours: number;
  declare availabilityPercent: number;
  declare capturedAt: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

DashboardSnapshot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rtuOnline: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'rtu_online',
    },
    rtuOffline: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'rtu_offline',
    },
    rtuWarning: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'rtu_warning',
    },
    criticalAlarms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'critical_alarms',
    },
    majorAlarms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'major_alarms',
    },
    minorAlarms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'minor_alarms',
    },
    mttrHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'mttr_hours',
    },
    mtbfHours: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'mtbf_hours',
    },
    availabilityPercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'availability_percent',
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'captured_at',
    },
  },
  {
    sequelize,
    modelName: 'DashboardSnapshot',
    tableName: 'dashboard_snapshots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default DashboardSnapshot;
