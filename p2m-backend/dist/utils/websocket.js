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
const initWebSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`🔌 WebSocket client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
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
