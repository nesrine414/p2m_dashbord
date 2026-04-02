import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PerformanceAttributes {
  id: number;
  fibreId: number;
  mttr?: number;
  mtbf?: number;
  recordedAt: Date;
  created_at?: Date;
  updated_at?: Date;
}

type PerformanceCreationAttributes = Optional<PerformanceAttributes, 'id' | 'mttr' | 'mtbf' | 'recordedAt'>;

class Performance
  extends Model<PerformanceAttributes, PerformanceCreationAttributes>
  implements PerformanceAttributes
{
  declare id: number;
  declare fibreId: number;
  declare mttr?: number;
  declare mtbf?: number;
  declare recordedAt: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Performance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fibreId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'fibre_id',
    },
    mttr: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    mtbf: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'recorded_at',
    },
  },
  {
    sequelize,
    modelName: 'Performance',
    tableName: 'performance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Performance;
