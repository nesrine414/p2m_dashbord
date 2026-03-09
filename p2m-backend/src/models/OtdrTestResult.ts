import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OtdrTestResultAttributes {
  id: number;
  rtuId?: number;
  routeId?: number;
  mode: 'auto' | 'manual' | 'scheduled';
  pulseWidth?: string;
  dynamicRangeDb?: number;
  wavelengthNm: 1310 | 1550 | 1625;
  result: 'pass' | 'fail';
  testedAt: Date;
  created_at?: Date;
  updated_at?: Date;
}

type OtdrTestResultCreationAttributes = Optional<OtdrTestResultAttributes, 'id' | 'testedAt'>;

class OtdrTestResult
  extends Model<OtdrTestResultAttributes, OtdrTestResultCreationAttributes>
  implements OtdrTestResultAttributes
{
  declare id: number;
  declare rtuId?: number;
  declare routeId?: number;
  declare mode: 'auto' | 'manual' | 'scheduled';
  declare pulseWidth?: string;
  declare dynamicRangeDb?: number;
  declare wavelengthNm: 1310 | 1550 | 1625;
  declare result: 'pass' | 'fail';
  declare testedAt: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

OtdrTestResult.init(
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
    mode: {
      type: DataTypes.ENUM('auto', 'manual', 'scheduled'),
      allowNull: false,
    },
    pulseWidth: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'pulse_width',
    },
    dynamicRangeDb: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'dynamic_range_db',
    },
    wavelengthNm: {
      type: DataTypes.ENUM('1310', '1550', '1625'),
      allowNull: false,
      field: 'wavelength_nm',
      get() {
        const raw = this.getDataValue('wavelengthNm') as unknown as string;
        return Number(raw) as 1310 | 1550 | 1625;
      },
      set(value: 1310 | 1550 | 1625) {
        this.setDataValue('wavelengthNm', String(value) as unknown as 1310 | 1550 | 1625);
      },
    },
    result: {
      type: DataTypes.ENUM('pass', 'fail'),
      allowNull: false,
    },
    testedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'tested_at',
    },
  },
  {
    sequelize,
    modelName: 'OtdrTestResult',
    tableName: 'otdr_test_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default OtdrTestResult;
