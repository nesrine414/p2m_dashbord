import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AuditLogAttributes {
  id: number;
  userId?: number;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id'>;

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: number;
  declare userId?: number;
  declare action: string;
  declare entity: string;
  declare entityId?: string;
  declare metadata?: Record<string, unknown>;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    action: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    entity: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'entity_id',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default AuditLog;
