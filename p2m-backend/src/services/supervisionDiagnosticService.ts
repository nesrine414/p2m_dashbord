import { databaseState } from '../config/database';
import { emulatorConfig } from '../config/emulatorConfig';
import { Alarm, Fibre, Measurement, OtdrTestResult, RTU } from '../models';
import { emitEvent } from '../utils/websocket';

// ─── Public types ─────────────────────────────────────────────────────────────

export type DiagnosticTestType = 'otdr' | 'temperature' | 'full';

export interface DiagnosticThresholds {
  attenuationWarningDb: number;
  attenuationCriticalDb: number;
  temperatureWarningC: number;
  temperatureCriticalC: number;
}

export interface DiagnosticMeasurementRow {
  parameter: string;
  value: number;
  unit: string;
  threshold: number;
  thresholdLabel: string;
  status: 'pass' | 'warning' | 'critical';
  alarmType?: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
}

export interface DiagnosticOtdrParams {
  wavelengthNm: 1310 | 1550 | 1625;
  pulseWidth: string;
  dynamicRangeDb: number;
  result: 'pass' | 'fail';
  mode: 'manual';
}

export interface DiagnosticAlarmCreated {
  id: number;
  alarmType: string;
  severity: string;
  message: string;
}

export interface DiagnosticTestResult {
  ipAddress: string;
  rtuId: number;
  rtuName: string;
  testedAt: string;
  testType: DiagnosticTestType;
  verdict: 'pass' | 'alarm';
  thresholds: DiagnosticThresholds;
  measurements: DiagnosticMeasurementRow[];
  otdr: DiagnosticOtdrParams | null;
  alarmCreated: DiagnosticAlarmCreated | null;
  fibreName: string | null;
  fibreLengthKm: number | null;
}

export interface RunDiagnosticTestInput {
  ipAddress: string;
  testType: DiagnosticTestType;
  thresholds?: Partial<DiagnosticThresholds>;
}

// ─── Simulation helpers ───────────────────────────────────────────────────────

const WAVELENGTHS: Array<1310 | 1550 | 1625> = [1310, 1550, 1625];
const PULSE_WIDTHS = ['10 ns', '30 ns', '50 ns', '100 ns', '300 ns'];

/**
 * Simulate realistic attenuation based on fibre length and status.
 * Adds gaussian-ish jitter so repeated runs look different.
 */
const simulateAttenuation = (fibre: Fibre): number => {
  const baseLength = typeof fibre.length === 'number' && Number.isFinite(fibre.length) ? fibre.length : 10;
  // Typical single-mode: ~0.25 dB/km @ 1550 nm + connector losses ~1 dB each end
  const idealAttenuation = baseLength * 0.25 + 2.0;

  const statusMultiplier =
    fibre.status === 'broken' ? 3.5 + Math.random() * 2.5 :
    fibre.status === 'degraded' ? 1.6 + Math.random() * 1.2 :
    1.0 + Math.random() * 0.3;

  const jitter = (Math.random() - 0.5) * 1.8;
  return Math.max(0.5, parseFloat((idealAttenuation * statusMultiplier + jitter).toFixed(1)));
};

/** Simulate a realistic temperature reading for the RTU. */
const simulateTemperature = (rtu: RTU): number => {
  const base = typeof rtu.temperature === 'number' ? rtu.temperature : 35;
  const jitter = (Math.random() - 0.5) * 6;
  return parseFloat(Math.max(20, base + jitter).toFixed(1));
};

const pickWavelength = (): 1310 | 1550 | 1625 =>
  WAVELENGTHS[Math.floor(Math.random() * WAVELENGTHS.length)];

const pickPulseWidth = (lengthKm: number): string => {
  if (lengthKm > 80) return '300 ns';
  if (lengthKm > 40) return '100 ns';
  if (lengthKm > 15) return '50 ns';
  if (lengthKm > 5)  return '30 ns';
  return '10 ns';
};

const calcDynamicRange = (lengthKm: number): number =>
  parseFloat(Math.min(45, 20 + lengthKm * 0.3 + Math.random() * 2).toFixed(1));

// ─── Core service ─────────────────────────────────────────────────────────────

export const runDiagnosticTest = async (
  input: RunDiagnosticTestInput
): Promise<DiagnosticTestResult | null> => {
  const { ipAddress, testType } = input;
  const normalizedIp = ipAddress.trim();
  if (!normalizedIp) return null;

  // Merge user-supplied thresholds with config defaults
  const thresholds: DiagnosticThresholds = {
    attenuationWarningDb:  input.thresholds?.attenuationWarningDb  ?? emulatorConfig.attenuationWarningDb,
    attenuationCriticalDb: input.thresholds?.attenuationCriticalDb ?? emulatorConfig.attenuationCriticalDb,
    temperatureWarningC:   input.thresholds?.temperatureWarningC   ?? emulatorConfig.temperatureWarningC,
    temperatureCriticalC:  input.thresholds?.temperatureCriticalC  ?? emulatorConfig.temperatureCriticalC,
  };

  const now = new Date();
  const measurements: DiagnosticMeasurementRow[] = [];
  let otdr: DiagnosticOtdrParams | null = null;
  let alarmCreated: DiagnosticAlarmCreated | null = null;
  let verdict: 'pass' | 'alarm' = 'pass';

  // ── Demo mode (no DB) ──────────────────────────────────────────────────────
  if (!databaseState.connected) {
    // Build synthetic result using plausible defaults
    const syntheticAttenuation = parseFloat((8 + Math.random() * 15).toFixed(1));
    const syntheticTemp = parseFloat((30 + Math.random() * 20).toFixed(1));

    if (testType === 'otdr' || testType === 'full') {
      const attStatus: DiagnosticMeasurementRow['status'] =
        syntheticAttenuation >= thresholds.attenuationCriticalDb ? 'critical' :
        syntheticAttenuation >= thresholds.attenuationWarningDb  ? 'warning'  : 'pass';

      measurements.push({
        parameter: 'Atténuation (OTDR)',
        value: syntheticAttenuation,
        unit: 'dB',
        threshold: attStatus === 'critical' ? thresholds.attenuationCriticalDb : thresholds.attenuationWarningDb,
        thresholdLabel: attStatus === 'critical' ? 'Seuil critique' : 'Seuil avertissement',
        status: attStatus,
        alarmType: syntheticAttenuation >= thresholds.attenuationCriticalDb ? 'Fiber Cut' : 'High Loss',
      });

      otdr = {
        wavelengthNm: pickWavelength(),
        pulseWidth: '30 ns',
        dynamicRangeDb: 24,
        result: attStatus !== 'pass' ? 'fail' : 'pass',
        mode: 'manual',
      };

      if (attStatus !== 'pass') verdict = 'alarm';
    }

    if (testType === 'temperature' || testType === 'full') {
      const tempStatus: DiagnosticMeasurementRow['status'] =
        syntheticTemp >= thresholds.temperatureCriticalC ? 'critical' :
        syntheticTemp >= thresholds.temperatureWarningC  ? 'warning'  : 'pass';

      measurements.push({
        parameter: 'Température interne',
        value: syntheticTemp,
        unit: '°C',
        threshold: tempStatus === 'critical' ? thresholds.temperatureCriticalC : thresholds.temperatureWarningC,
        thresholdLabel: tempStatus === 'critical' ? 'Seuil critique' : 'Seuil avertissement',
        status: tempStatus,
        alarmType: 'Temperature',
      });

      if (tempStatus !== 'pass') verdict = 'alarm';
    }

    return {
      ipAddress: normalizedIp,
      rtuId: 0,
      rtuName: `RTU @ ${normalizedIp}`,
      testedAt: now.toISOString(),
      testType,
      verdict,
      thresholds,
      measurements,
      otdr,
      alarmCreated: null,
      fibreName: null,
      fibreLengthKm: null,
    };
  }

  // ── Database mode ──────────────────────────────────────────────────────────
  const rtu = await RTU.findOne({ where: { ipAddress: normalizedIp } });
  if (!rtu) return null;

  const fibre = await Fibre.findOne({ where: { rtuId: rtu.id }, order: [['id', 'ASC']] });

  // ── Simulate OTDR / attenuation ────────────────────────────────────────────
  if (testType === 'otdr' || testType === 'full') {
    const attenuation = simulateAttenuation(fibre ?? ({} as Fibre));
    const lengthKm = typeof fibre?.length === 'number' ? fibre.length : 10;
    const wavelength = pickWavelength();
    const pulseWidth = pickPulseWidth(lengthKm);
    const dynamicRange = calcDynamicRange(lengthKm);

    const attStatus: DiagnosticMeasurementRow['status'] =
      attenuation >= thresholds.attenuationCriticalDb ? 'critical' :
      attenuation >= thresholds.attenuationWarningDb  ? 'warning'  : 'pass';

    const otdrResult: 'pass' | 'fail' = attStatus !== 'pass' ? 'fail' : 'pass';

    measurements.push({
      parameter: 'Atténuation (OTDR)',
      value: attenuation,
      unit: 'dB',
      threshold: attStatus === 'critical' ? thresholds.attenuationCriticalDb : thresholds.attenuationWarningDb,
      thresholdLabel: attStatus === 'critical' ? 'Seuil critique' : 'Seuil avertissement',
      status: attStatus,
      alarmType: attenuation >= thresholds.attenuationCriticalDb ? 'Fiber Cut' : 'High Loss',
    });

    otdr = { wavelengthNm: wavelength, pulseWidth, dynamicRangeDb: dynamicRange, result: otdrResult, mode: 'manual' };

    if (attStatus !== 'pass') verdict = 'alarm';

    // Persist measurement and OTDR test result
    if (fibre) {
      await Measurement.create({
        fibreId: fibre.id,
        attenuation,
        testResult: otdrResult,
        wavelength,
        timestamp: now,
      });

      await OtdrTestResult.create({
        rtuId: rtu.id,
        routeId: fibre.id,
        mode: 'manual',
        pulseWidth,
        dynamicRangeDb: dynamicRange,
        wavelengthNm: wavelength,
        result: otdrResult,
        testedAt: now,
      });
    }

    // Raise alarm if threshold exceeded
    if (attStatus !== 'pass' && !alarmCreated) {
      const alarmType = attenuation >= thresholds.attenuationCriticalDb ? 'Fiber Cut' : 'High Loss';
      const severity = attStatus === 'critical' ? 'critical' : 'major';
      const label = fibre ? `${rtu.name} ${fibre.name}` : rtu.name;
      const message =
        alarmType === 'Fiber Cut'
          ? `Fiber cut detected on ${label}. Measured attenuation: ${attenuation} dB (threshold: ${thresholds.attenuationCriticalDb} dB).`
          : `High loss detected on ${label}. Measured attenuation: ${attenuation} dB (threshold: ${thresholds.attenuationWarningDb} dB).`;

      const alarm = await Alarm.create({
        rtuId: rtu.id,
        ...(fibre ? { fibreId: fibre.id, routeId: fibre.id } : {}),
        alarmType,
        severity,
        lifecycleStatus: 'active',
        message,
        location: rtu.locationAddress || rtu.name,
        localizationKm: fibre?.length ? `KM ${fibre.length.toFixed(1)}` : undefined,
        owner: 'Diagnostic Test (Manual)',
        occurredAt: now,
      });

      alarmCreated = { id: alarm.id, alarmType, severity, message };
      emitEvent('new_alarm', alarm.get({ plain: true }));
      emitEvent('alarm_updated', alarm.get({ plain: true }));
    }
  }

  // ── Simulate temperature ───────────────────────────────────────────────────
  if (testType === 'temperature' || testType === 'full') {
    const temperature = simulateTemperature(rtu);

    const tempStatus: DiagnosticMeasurementRow['status'] =
      temperature >= thresholds.temperatureCriticalC ? 'critical' :
      temperature >= thresholds.temperatureWarningC  ? 'warning'  : 'pass';

    measurements.push({
      parameter: 'Température interne RTU',
      value: temperature,
      unit: '°C',
      threshold: tempStatus === 'critical' ? thresholds.temperatureCriticalC : thresholds.temperatureWarningC,
      thresholdLabel: tempStatus === 'critical' ? 'Seuil critique' : 'Seuil avertissement',
      status: tempStatus,
      alarmType: 'Temperature',
    });

    if (tempStatus !== 'pass') verdict = 'alarm';

    // Update RTU temperature record
    await rtu.update({ temperature, lastSeen: now });
    emitEvent('rtu_updated', rtu.get({ plain: true }));

    // Raise temperature alarm if no alarm raised yet (one alarm per test)
    if (tempStatus !== 'pass' && !alarmCreated) {
      const severity = tempStatus === 'critical' ? 'critical' : 'major';
      const message =
        tempStatus === 'critical'
          ? `Temperature critical on ${rtu.name}: ${temperature}°C (threshold: ${thresholds.temperatureCriticalC}°C).`
          : `Temperature high on ${rtu.name}: ${temperature}°C (threshold: ${thresholds.temperatureWarningC}°C).`;

      const alarm = await Alarm.create({
        rtuId: rtu.id,
        alarmType: 'Temperature',
        severity,
        lifecycleStatus: 'active',
        message,
        location: rtu.locationAddress || rtu.name,
        owner: 'Diagnostic Test (Manual)',
        occurredAt: now,
      });

      alarmCreated = { id: alarm.id, alarmType: 'Temperature', severity, message };
      emitEvent('new_alarm', alarm.get({ plain: true }));
      emitEvent('alarm_updated', alarm.get({ plain: true }));
    }
  }

  return {
    ipAddress: normalizedIp,
    rtuId: rtu.id,
    rtuName: rtu.name,
    testedAt: now.toISOString(),
    testType,
    verdict,
    thresholds,
    measurements,
    otdr,
    alarmCreated,
    fibreName: fibre?.name ?? null,
    fibreLengthKm: fibre?.length ?? null,
  };
};
