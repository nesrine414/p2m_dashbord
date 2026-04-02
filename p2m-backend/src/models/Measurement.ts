import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MeasurementAttributes {
  id: number;
  fibreId: number;
  attenuation?: number;
  testResult: 'pass' | 'fail';
  wavelength: 1310 | 1550 | 1625;
  timestamp: Date;
  created_at?: Date;
  updated_at?: Date;
}

type MeasurementCreationAttributes = Optional<MeasurementAttributes, 'id' | 'attenuation' | 'timestamp'>;

class Measurement
  extends Model<MeasurementAttributes, MeasurementCreationAttributes>
  implements MeasurementAttributes
{
  declare id: number;
  declare fibreId: number;
  declare attenuation?: number;
  declare testResult: 'pass' | 'fail';
  declare wavelength: 1310 | 1550 | 1625;
  declare timestamp: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Measurement.init(
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
    attenuation: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    testResult: {
      type: DataTypes.ENUM('pass', 'fail'),
      allowNull: false,
      field: 'test_result',
    },
    wavelength: {
      type: DataTypes.ENUM('1310', '1550', '1625'),
      allowNull: false,
      get() {
        const raw = this.getDataValue('wavelength') as unknown as string;
        return Number(raw) as 1310 | 1550 | 1625;
      },
      set(value: 1310 | 1550 | 1625) {
        this.setDataValue('wavelength', String(value) as unknown as 1310 | 1550 | 1625);
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Measurement',
    tableName: 'measurement',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Measurement;
