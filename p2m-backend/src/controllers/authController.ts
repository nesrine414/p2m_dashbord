import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const signToken = (user: { id: number; username: string; role: 'admin' | 'user' | 'customer' }): string =>
  jwt.sign(user, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { username, password, email, role, firstName, lastName, phone } = req.body as {
      username?: string;
      password?: string;
      email?: string;
      role?: 'admin' | 'user' | 'customer';
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    if (!password || !email) {
      res.status(400).json({ error: 'password and email are required' });
      return;
    }

    const baseUsername = (username || email.split('@')[0] || phone || '').trim();
    if (!baseUsername) {
      res.status(400).json({ error: 'username is required (or derivable from email/phone)' });
      return;
    }

    let finalUsername = baseUsername;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await User.findOne({ where: { username: finalUsername } });
      if (!existing) break;
      finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const existingFinal = await User.findOne({ where: { username: finalUsername } });
    if (existingFinal) {
      res.status(409).json({ error: 'username already exists' });
      return;
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ error: 'email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      username: finalUsername,
      password: hashedPassword,
      email,
      role: role || 'user',
      firstName,
      lastName,
      phone,
    });

    const token = signToken({
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
    });

    res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
      },
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const field = error.errors[0]?.path || 'field';
      res.status(409).json({ error: `${field} already exists` });
      return;
    }

    if (error instanceof ValidationError) {
      const message = error.errors[0]?.message || 'Validation failed';
      res.status(400).json({ error: message });
      return;
    }

    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { username, email, phone, password } = req.body as {
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const identifier = (username || email || phone || '').trim();

    if (!identifier || !password) {
      res.status(400).json({ error: 'email/phone (or username) and password are required' });
      return;
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }, { phone: identifier }],
      },
    });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
