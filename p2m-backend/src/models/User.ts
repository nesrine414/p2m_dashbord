import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserAttributes {
  id: number;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'user' | 'customer';
  firstName?: string;
  lastName?: string;
  phone?: string;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role'>;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare password: string;
  declare email: string;
  declare role: 'admin' | 'user' | 'customer';
  declare firstName?: string;
  declare lastName?: string;
  declare phone?: string;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'user', 'customer'),
      allowNull: false,
      defaultValue: 'user',
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'last_name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;
