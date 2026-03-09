import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HealthScoreAttributes {
  id: number;
  rtuId?: number;
  score: number;
  details?: Record<string, unknown>;
  calculatedAt: Date;
  created_at?: Date;
  updated_at?: Date;
}

type HealthScoreCreationAttributes = Optional<HealthScoreAttributes, 'id' | 'calculatedAt'>;

class HealthScore
  extends Model<HealthScoreAttributes, HealthScoreCreationAttributes>
  implements HealthScoreAttributes
{
  declare id: number;
  declare rtuId?: number;
  declare score: number;
  declare details?: Record<string, unknown>;
  declare calculatedAt: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

HealthScore.init(
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
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'calculated_at',
    },
  },
  {
    sequelize,
    modelName: 'HealthScore',
    tableName: 'health_scores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default HealthScore;
