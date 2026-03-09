"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alarm_routes_1 = __importDefault(require("./alarm.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const rtu_routes_1 = __importDefault(require("./rtu.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/rtu', rtu_routes_1.default);
router.use('/alarms', alarm_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
exports.default = router;
