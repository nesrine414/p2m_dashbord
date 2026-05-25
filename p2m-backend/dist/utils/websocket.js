"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.getIO = exports.initWebSocket = void 0;
const sequelize_1 = require("sequelize");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let io = null;
const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'];
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
        void (async () => {
            try {
                const [{ default: Alarm }, { toRealtimeAlarmPayload }] = await Promise.all([
                    Promise.resolve().then(() => __importStar(require('../models/Alarm'))),
                    Promise.resolve().then(() => __importStar(require('../services/alarmRealtimeService'))),
                ]);
                const openAlarms = await Alarm.findAll({
                    where: {
                        lifecycleStatus: {
                            [sequelize_1.Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES,
                        },
                    },
                    order: [['occurredAt', 'DESC']],
                    limit: 100,
                });
                for (const alarm of openAlarms) {
                    socket.emit('alarm_updated', await toRealtimeAlarmPayload(alarm));
                }
                if (openAlarms.length > 0) {
                    console.log(`WebSocket replayed ${openAlarms.length} open alarm(s) to ${socket.id}`);
                }
            }
            catch (error) {
                console.warn(`WebSocket alarm replay failed for ${socket.id}:`, error);
            }
        })();
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
