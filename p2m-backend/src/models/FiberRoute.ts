import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FiberRouteAttributes {
  id: number;
  routeName: string;
  source: string;
  destination: string;
  fiberStatus: 'normal' | 'degraded' | 'broken';
  routeStatus: 'active' | 'inactive' | 'skipped';
  lengthKm?: number;
  attenuationDb?: number;
  reflectionEvents: boolean;
  lastTestTime?: Date;
  created_at?: Date;
  updated_at?: Date;
}

type FiberRouteCreationAttributes = Optional<FiberRouteAttributes, 'id' | 'fiberStatus' | 'routeStatus' | 'reflectionEvents'>;

class FiberRoute
  extends Model<FiberRouteAttributes, FiberRouteCreationAttributes>
  implements FiberRouteAttributes
{
  declare id: number;
  declare routeName: string;
  declare source: string;
  declare destination: string;
  declare fiberStatus: 'normal' | 'degraded' | 'broken';
  declare routeStatus: 'active' | 'inactive' | 'skipped';
  declare lengthKm?: number;
  declare attenuationDb?: number;
  declare reflectionEvents: boolean;
  declare lastTestTime?: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

FiberRoute.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    routeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'route_name',
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fiberStatus: {
      type: DataTypes.ENUM('normal', 'degraded', 'broken'),
      allowNull: false,
      defaultValue: 'normal',
      field: 'fiber_status',
    },
    routeStatus: {
      type: DataTypes.ENUM('active', 'inactive', 'skipped'),
      allowNull: false,
      defaultValue: 'active',
      field: 'route_status',
    },
    lengthKm: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'length_km',
    },
    attenuationDb: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'attenuation_db',
    },
    reflectionEvents: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'reflection_events',
    },
    lastTestTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_test_time',
    },
  },
  {
    sequelize,
    modelName: 'FiberRoute',
    tableName: 'fiber_routes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default FiberRoute;
