"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const models_1 = require("../models");
const signToken = (user) => jsonwebtoken_1.default.sign(user, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
});
const register = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const { username, password, email, role, firstName, lastName, phone } = req.body;
        if (!username || !password || !email) {
            res.status(400).json({ error: 'username, password and email are required' });
            return;
        }
        const existing = await models_1.User.findOne({ where: { username } });
        if (existing) {
            res.status(409).json({ error: 'username already exists' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const createdUser = await models_1.User.create({
            username,
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register user' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'username and password are required' });
            return;
        }
        const user = await models_1.User.findOne({ where: { username } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
};
exports.login = login;
const me = async (req, res) => {
    try {
        if (!database_1.databaseState.connected) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const user = await models_1.User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};
exports.me = me;
