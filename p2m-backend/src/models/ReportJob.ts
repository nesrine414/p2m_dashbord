import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ReportJobAttributes {
  id: number;
  name: string;
  period: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  outputPath?: string;
  requestedBy?: number;
  generatedAt?: Date;
  created_at?: Date;
  updated_at?: Date;
}

type ReportJobCreationAttributes = Optional<ReportJobAttributes, 'id' | 'status'>;

class ReportJob extends Model<ReportJobAttributes, ReportJobCreationAttributes> implements ReportJobAttributes {
  declare id: number;
  declare name: string;
  declare period: string;
  declare status: 'queued' | 'running' | 'ready' | 'failed';
  declare outputPath?: string;
  declare requestedBy?: number;
  declare generatedAt?: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

ReportJob.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    period: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('queued', 'running', 'ready', 'failed'),
      allowNull: false,
      defaultValue: 'queued',
    },
    outputPath: {
      type: DataTypes.STRING(400),
      allowNull: true,
      field: 'output_path',
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'requested_by',
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'generated_at',
    },
  },
  {
    sequelize,
    modelName: 'ReportJob',
    tableName: 'report_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default ReportJob;
