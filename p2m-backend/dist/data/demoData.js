"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoAlarms = exports.demoOtdrTests = exports.demoFiberRoutes = exports.demoPerformances = exports.demoFibreAlarms = exports.demoMeasurements = exports.demoFibres = exports.demoRtus = void 0;
const FIBRE_OFFSETS = [
    [0.0, 0.018],
    [0.014, 0.012],
    [0.018, 0.0],
    [0.014, -0.012],
    [0.0, -0.018],
    [-0.014, -0.012],
    [-0.018, 0.0],
    [-0.014, 0.012],
];
exports.demoRtus = [
    {
        id: 1,
        name: 'RTU-TUNIS-BACKBONE',
        locationAddress: 'Tunis Centre',
        locationLatitude: 36.8065,
        locationLongitude: 10.1815,
        ipAddress: '10.60.1.11',
        serialNumber: 'NQMS-RTU-TN-0001',
        status: 'online',
        power: 'normal',
        temperature: 31,
        otdrStatus: 'ready',
        lastSeen: '2026-04-02T10:02:00.000Z',
    },
    {
        id: 2,
        name: 'RTU-SOUSSE-METRO',
        locationAddress: 'Sousse Ville',
        locationLatitude: 35.8256,
        locationLongitude: 10.636,
        ipAddress: '10.60.1.12',
        serialNumber: 'NQMS-RTU-TN-0002',
        status: 'online',
        power: 'normal',
        temperature: 39,
        otdrStatus: 'busy',
        lastSeen: '2026-04-02T09:54:00.000Z',
    },
    {
        id: 3,
        name: 'RTU-SFAX-CORE',
        locationAddress: 'Sfax Centre',
        locationLatitude: 34.7398,
        locationLongitude: 10.76,
        ipAddress: '10.60.1.13',
        serialNumber: 'NQMS-RTU-TN-0003',
        status: 'online',
        power: 'normal',
        temperature: 30,
        otdrStatus: 'ready',
        lastSeen: '2026-04-02T10:01:00.000Z',
    },
    {
        id: 4,
        name: 'RTU-GABES-AGGREGATION',
        locationAddress: 'Gabes Hub',
        locationLatitude: 33.8881,
        locationLongitude: 10.0972,
        ipAddress: '10.60.1.14',
        serialNumber: 'NQMS-RTU-TN-0004',
        status: 'offline',
        power: 'failure',
        temperature: 0,
        otdrStatus: 'fault',
        lastSeen: '2026-04-02T08:15:00.000Z',
    },
    {
        id: 5,
        name: 'RTU-GAFSA-EDGE',
        locationAddress: 'Gafsa Backbone',
        locationLatitude: 34.4311,
        locationLongitude: 8.7757,
        ipAddress: '10.60.1.15',
        serialNumber: 'NQMS-RTU-TN-0005',
        status: 'unreachable',
        power: 'failure',
        temperature: 36,
        otdrStatus: 'fault',
        lastSeen: '2026-04-02T08:42:00.000Z',
    },
    {
        id: 6,
        name: 'RTU-BIZERTE-DISTRIBUTION',
        locationAddress: 'Bizerte Nord',
        locationLatitude: 37.2746,
        locationLongitude: 9.8739,
        ipAddress: '10.60.1.16',
        serialNumber: 'NQMS-RTU-TN-0006',
        status: 'online',
        power: 'normal',
        temperature: 29,
        otdrStatus: 'ready',
        lastSeen: '2026-04-02T10:00:30.000Z',
    },
];
exports.demoFibres = [
    { id: 1, rtuId: 1, name: 'F1', length: 24.5, status: 'normal' },
    { id: 2, rtuId: 1, name: 'F2', length: 18.2, status: 'degraded' },
    { id: 3, rtuId: 1, name: 'F3', length: 35.1, status: 'normal' },
    { id: 4, rtuId: 2, name: 'F1', length: 14.8, status: 'degraded' },
    { id: 5, rtuId: 2, name: 'F2', length: 9.6, status: 'normal' },
    { id: 6, rtuId: 3, name: 'F1', length: 27.3, status: 'normal' },
    { id: 7, rtuId: 3, name: 'F2', length: 19.4, status: 'broken' },
    { id: 8, rtuId: 4, name: 'F1', length: 16.1, status: 'broken' },
    { id: 9, rtuId: 4, name: 'F2', length: 13.5, status: 'degraded' },
    { id: 10, rtuId: 5, name: 'F1', length: 21.7, status: 'degraded' },
    { id: 11, rtuId: 6, name: 'F1', length: 11.4, status: 'normal' },
    { id: 12, rtuId: 6, name: 'F2', length: 15.2, status: 'normal' },
];
exports.demoMeasurements = [
    { id: 1, fibreId: 1, attenuation: 4.8, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:40:00.000Z' },
    { id: 2, fibreId: 2, attenuation: 8.6, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T09:37:00.000Z' },
    { id: 3, fibreId: 3, attenuation: 5.4, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:28:00.000Z' },
    { id: 4, fibreId: 4, attenuation: 7.9, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T09:32:00.000Z' },
    { id: 5, fibreId: 5, attenuation: 3.6, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:46:00.000Z' },
    { id: 6, fibreId: 6, attenuation: 4.2, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:48:00.000Z' },
    { id: 7, fibreId: 7, attenuation: 15.7, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T09:18:00.000Z' },
    { id: 8, fibreId: 8, attenuation: 17.1, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T08:10:00.000Z' },
    { id: 9, fibreId: 9, attenuation: 9.1, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T08:42:00.000Z' },
    { id: 10, fibreId: 10, attenuation: 8.4, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T08:53:00.000Z' },
    { id: 11, fibreId: 11, attenuation: 3.1, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:55:00.000Z' },
    { id: 12, fibreId: 12, attenuation: 3.9, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:58:00.000Z' },
];
exports.demoFibreAlarms = [
    { id: 1001, fibreId: 2, type: 'High Loss', severity: 'major', status: 'active', localization: 12.4, timestamp: '2026-04-02T09:37:00.000Z' },
    { id: 1002, fibreId: 4, type: 'High Loss', severity: 'major', status: 'active', localization: 6.8, timestamp: '2026-04-02T09:32:00.000Z' },
    { id: 1003, fibreId: 7, type: 'Fiber Cut', severity: 'critical', status: 'active', localization: 11.2, timestamp: '2026-04-02T09:18:00.000Z' },
    { id: 1004, fibreId: 8, type: 'Fiber Cut', severity: 'critical', status: 'active', localization: 3.9, timestamp: '2026-04-02T08:10:00.000Z' },
    { id: 1005, fibreId: 9, type: 'High Loss', severity: 'major', status: 'active', localization: 8.5, timestamp: '2026-04-02T08:42:00.000Z' },
    { id: 1006, fibreId: 10, type: 'High Loss', severity: 'minor', status: 'cleared', localization: 10.1, timestamp: '2026-04-02T08:53:00.000Z' },
];
exports.demoPerformances = [
    { id: 1, fibreId: 1, mttr: 1.8, mtbf: 216, recordedAt: '2026-04-02T09:00:00.000Z' },
    { id: 2, fibreId: 2, mttr: 3.4, mtbf: 132, recordedAt: '2026-04-02T09:00:00.000Z' },
    { id: 3, fibreId: 7, mttr: 6.2, mtbf: 81, recordedAt: '2026-04-02T09:00:00.000Z' },
    { id: 4, fibreId: 8, mttr: 8.1, mtbf: 64, recordedAt: '2026-04-02T09:00:00.000Z' },
];
const latestMeasurementByFibre = new Map(exports.demoMeasurements
    .slice()
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .map((measurement) => [measurement.fibreId, measurement]));
const buildFibrePath = (rtu, fibreName) => {
    const fibreIndex = Math.max(0, Number(fibreName.replace(/\D+/g, '')) - 1) % FIBRE_OFFSETS.length;
    const [latOffset, lonOffset] = FIBRE_OFFSETS[fibreIndex];
    return [
        [rtu.locationLatitude, rtu.locationLongitude],
        [Number((rtu.locationLatitude + latOffset).toFixed(6)), Number((rtu.locationLongitude + lonOffset).toFixed(6))],
    ];
};
const toRouteStatus = (status) => {
    if (status === 'broken') {
        return 'inactive';
    }
    if (status === 'degraded') {
        return 'skipped';
    }
    return 'active';
};
const getPulseWidth = (length) => {
    if (length >= 30) {
        return '100 ns';
    }
    if (length >= 20) {
        return '50 ns';
    }
    return '30 ns';
};
const getMode = (measurement) => {
    if (measurement.testResult === 'fail') {
        return 'manual';
    }
    if (measurement.wavelength === 1625) {
        return 'scheduled';
    }
    return 'auto';
};
exports.demoFiberRoutes = exports.demoFibres.map((fibre) => {
    const rtu = exports.demoRtus.find((item) => item.id === fibre.rtuId);
    const latestMeasurement = latestMeasurementByFibre.get(fibre.id);
    if (!rtu) {
        throw new Error(`RTU not found for fibre ${fibre.id}`);
    }
    return {
        id: fibre.id,
        routeName: `${rtu.name}-${fibre.name}`,
        source: rtu.locationAddress,
        destination: `Fibre ${fibre.name}`,
        fiberStatus: fibre.status,
        routeStatus: toRouteStatus(fibre.status),
        lengthKm: fibre.length,
        attenuationDb: latestMeasurement?.attenuation ?? 0,
        reflectionEvents: latestMeasurement?.testResult === 'fail',
        lastTestTime: latestMeasurement?.timestamp || rtu.lastSeen,
        path: buildFibrePath(rtu, fibre.name),
    };
});
exports.demoOtdrTests = exports.demoMeasurements.map((measurement) => {
    const fibre = exports.demoFibres.find((item) => item.id === measurement.fibreId);
    if (!fibre) {
        throw new Error(`Fibre not found for measurement ${measurement.id}`);
    }
    return {
        id: measurement.id,
        rtuId: fibre.rtuId,
        routeId: fibre.id,
        mode: getMode(measurement),
        pulseWidth: getPulseWidth(fibre.length),
        dynamicRangeDb: Number((measurement.attenuation + 12).toFixed(1)),
        wavelengthNm: measurement.wavelength,
        result: measurement.testResult,
        testedAt: measurement.timestamp,
    };
});
exports.demoAlarms = exports.demoFibreAlarms.map((alarm) => {
    const fibre = exports.demoFibres.find((item) => item.id === alarm.fibreId);
    const rtu = fibre ? exports.demoRtus.find((item) => item.id === fibre.rtuId) : undefined;
    if (!fibre || !rtu) {
        throw new Error(`Fibre or RTU not found for alarm ${alarm.id}`);
    }
    return {
        id: alarm.id,
        rtuId: rtu.id,
        fibreId: fibre.id,
        routeId: fibre.id,
        severity: alarm.severity,
        lifecycleStatus: alarm.status === 'active' ? 'active' : 'resolved',
        alarmType: alarm.type,
        message: alarm.type === 'Fiber Cut'
            ? `Fiber cut detected on ${rtu.name} ${fibre.name}.`
            : `High loss detected on ${rtu.name} ${fibre.name}.`,
        location: rtu.locationAddress,
        localizationKm: `KM ${alarm.localization.toFixed(1)}`,
        owner: 'Emulator NQMS',
        occurredAt: alarm.timestamp,
    };
});
