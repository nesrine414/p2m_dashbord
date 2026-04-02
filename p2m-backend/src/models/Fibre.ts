import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FibreAttributes {
  id: number;
  rtuId: number;
  name: string;
  length?: number;
  status: 'normal' | 'degraded' | 'broken';
  created_at?: Date;
  updated_at?: Date;
}

type FibreCreationAttributes = Optional<FibreAttributes, 'id' | 'length' | 'status'>;

class Fibre extends Model<FibreAttributes, FibreCreationAttributes> implements FibreAttributes {
  declare id: number;
  declare rtuId: number;
  declare name: string;
  declare length?: number;
  declare status: 'normal' | 'degraded' | 'broken';
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Fibre.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rtuId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'rtu_id',
    },
    name: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    length: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('normal', 'degraded', 'broken'),
      allowNull: false,
      defaultValue: 'normal',
    },
  },
  {
    sequelize,
    modelName: 'Fibre',
    tableName: 'fibre',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Fibre;
