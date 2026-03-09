import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PredictionAttributes {
  id: number;
  rtuId?: number;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  horizonHours: number;
  primaryDriver?: string;
  predictedAt: Date;
  validUntil?: Date;
  created_at?: Date;
  updated_at?: Date;
}

type PredictionCreationAttributes = Optional<PredictionAttributes, 'id' | 'predictedAt'>;

class Prediction
  extends Model<PredictionAttributes, PredictionCreationAttributes>
  implements PredictionAttributes
{
  declare id: number;
  declare rtuId?: number;
  declare probability: number;
  declare riskLevel: 'low' | 'medium' | 'high' | 'critical';
  declare horizonHours: number;
  declare primaryDriver?: string;
  declare predictedAt: Date;
  declare validUntil?: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Prediction.init(
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
    probability: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      field: 'risk_level',
    },
    horizonHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'horizon_hours',
    },
    primaryDriver: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'primary_driver',
    },
    predictedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'predicted_at',
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'valid_until',
    },
  },
  {
    sequelize,
    modelName: 'Prediction',
    tableName: 'predictions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Prediction;
