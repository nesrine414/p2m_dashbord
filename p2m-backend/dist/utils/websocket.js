"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.getIO = exports.initWebSocket = void 0;
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let io = null;
const isAllowedDevOrigin = (origin) => {
    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== 'http:' && protocol !== 'https:') {
            return false;
        }
        return (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.'));
    }
    catch {
        return false;
    }
};
const initWebSocket = (httpServer) => {
    const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || origin === configuredFrontendUrl || isAllowedDevOrigin(origin)) {
                    callback(null, true);
                    return;
                }
                callback(new Error(`WebSocket CORS blocked for origin: ${origin}`));
            },
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`WebSocket client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`WebSocket client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initWebSocket = initWebSocket;
const getIO = () => io;
exports.getIO = getIO;
const emitEvent = (event, payload) => {
    if (!io) {
        return;
    }
    io.emit(event, payload);
};
exports.emitEvent = emitEvent;
