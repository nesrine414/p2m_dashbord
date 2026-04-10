import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface NotificationAttributes {
  id: number;
  alarmId?: number | null;
  notificationType: 'alarm_new' | 'alarm_update' | 'system';
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
  created_at?: Date;
  updated_at?: Date;
}

type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  'id' | 'alarmId' | 'metadata' | 'isRead' | 'occurredAt'
>;

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: number;
  declare alarmId?: number | null;
  declare notificationType: 'alarm_new' | 'alarm_update' | 'system';
  declare severity: 'critical' | 'major' | 'minor' | 'info';
  declare title: string;
  declare message: string;
  declare isRead: boolean;
  declare metadata?: Record<string, unknown> | null;
  declare occurredAt: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    alarmId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'alarm_id',
    },
    notificationType: {
      type: DataTypes.ENUM('alarm_new', 'alarm_update', 'system'),
      allowNull: false,
      defaultValue: 'system',
      field: 'notification_type',
    },
    severity: {
      type: DataTypes.ENUM('critical', 'major', 'minor', 'info'),
      allowNull: false,
      defaultValue: 'info',
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'occurred_at',
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Notification;
