import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, OtdrTestResult, RTU } from '../models';
import { emitEvent } from '../utils/websocket';
import { emulatorConfig, EmulatorIncidentType, getRandomIncidentDurationMs } from '../config/emulatorConfig';
import incidentRegistry from './incidentRegistry';
import {
  buildTelemetryBundleForDashboard,
  lookupTelemetryBundleByIp,
} from './rtuTelemetryService';
import {
  persistDashboardSnapshot,
  persistPerformanceSnapshot,
} from './kpiCalculatorService';
import {
  SupervisionEmulatorStatus,
  SupervisionIncidentRecord,
  SupervisionAlarmSeverity,
  SupervisionAlarmType,
  SupervisionPowerStatus,
  SupervisionRtuStatus,
  SupervisionTelemetryBundle,
} from '../types/supervision';

const NORMAL_WAVELENGTH: 1310 | 1550 | 1625 = 1550;
const HISTORICAL_POINTS_PER_FIBRE = emulatorConfig.measurementHistoryPointsPerFibre;
const HISTORICAL_SPACING_MS = emulatorConfig.measurementHistorySpacingMinutes * 60 * 1000;
const MIN_ATTENUATION_DB = 0.8;

const normalizeIp = (ipAddress: string): string => ipAddress.trim();

const plain = <T extends { get?: (options?: { plain: boolean }) => unknown }>(instance: T): unknown =>
  typeof instance.get === 'function' ? instance.get({ plain: true }) : instance;

const clampAttenuation = (value: number): number => Number(Math.max(MIN_ATTENUATION_DB, value).toFixed(1));

const inferTestResult = (attenuationDb: number, fibreStatus?: string): 'pass' | 'fail' => {
  if (fibreStatus === 'broken') {
    return 'fail';
  }

  if (attenuationDb >= emulatorConfig.attenuationCriticalDb) {
    return 'fail';
  }

  if (fibreStatus === 'degraded' && attenuationDb >= emulatorConfig.attenuationWarningDb * 0.8) {
    return 'fail';
  }

  return attenuationDb >= emulatorConfig.attenuationWarningDb * 0.95 ? 'fail' : 'pass';
};

const buildHistoricalAttenuation = (
  baseAttenuation: number,
  fibreStatus: string,
  stepIndex: number,
  totalSteps: number
): number => {
  const progress = totalSteps <= 1 ? 1 : stepIndex / (totalSteps + 1);
  const severityLift =
    fibreStatus === 'broken' ? 2.8 : fibreStatus === 'degraded' ? 1.4 : 0.7;
  const drift = severityLift * (1 - progress);
  const jitter = ((stepIndex % 3) - 1) * 0.08;

  return clampAttenuation(baseAttenuation - drift + jitter);
};

const buildFallbackAttenuation = (fibre: Fibre): number => {
  const length = typeof fibre.length === 'number' && Number.isFinite(fibre.length) ? fibre.length : 12;
  const lengthComponent = Math.max(2.5, length / 5.2);
  const statusLift = fibre.status === 'broken' ? 2.2 : fibre.status === 'degraded' ? 1.1 : 0.5;

  return clampAttenuation(lengthComponent + statusLift);
};

export class SupervisionEmulatorService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastTickAt: Date | null = null;
  private cycleIndex = 0;
  private measurementHistorySeeded = false;
  private measurementHistorySeedPromise: Promise<void> | null = null;

  getStatus(): SupervisionEmulatorStatus {
    return {
      enabled: emulatorConfig.enabled,
      running: this.running,
      activeIncidents: incidentRegistry.count(),
      tickIntervalMs: emulatorConfig.tickIntervalMs,
      lastTickAt: this.lastTickAt ? this.lastTickAt.toISOString() : null,
      nextTickAt: this.running ? new Date(Date.now() + emulatorConfig.tickIntervalMs).toISOString() : null,
      source: databaseState.connected ? 'emulator' : 'demo',
    };
  }

  async seedHistoricalMeasurements(): Promise<void> {
    if (!databaseState.connected) {
      return;
    }

    if (this.measurementHistorySeeded) {
      return;
    }

    if (this.measurementHistorySeedPromise) {
      await this.measurementHistorySeedPromise;
      return;
    }

    this.measurementHistorySeedPromise = this.seedHistoricalMeasurementsInternal().finally(() => {
      this.measurementHistorySeedPromise = null;
    });

    await this.measurementHistorySeedPromise;
  }

  start(): SupervisionEmulatorStatus {
    if (!emulatorConfig.enabled || this.running || !databaseState.connected) {
      return this.getStatus();
    }

    this.running = true;
    void this.seedHistoricalMeasurements();
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, emulatorConfig.tickIntervalMs);

    return this.getStatus();
  }

  stop(): SupervisionEmulatorStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;
    return this.getStatus();
  }

  private async seedHistoricalMeasurementsInternal(): Promise<void> {
    const [fibres, measurements] = await Promise.all([
      Fibre.findAll({ order: [['id', 'ASC']] }),
      Measurement.findAll({ order: [['fibreId', 'ASC'], ['timestamp', 'ASC']] }),
    ]);

    if (fibres.length === 0) {
      this.measurementHistorySeeded = true;
      return;
    }

    const measurementsByFibre = new Map<number, Measurement[]>();
    measurements.forEach((measurement) => {
      const fibreId = measurement.get('fibreId') as number;
      const bucket = measurementsByFibre.get(fibreId) || [];
      bucket.push(measurement);
      measurementsByFibre.set(fibreId, bucket);
    });

    const historyRecords: Array<{
      fibreId: number;
      attenuation: number;
      testResult: 'pass' | 'fail';
      wavelength: 1310 | 1550 | 1625;
      timestamp: Date;
    }> = [];

    fibres.forEach((fibre) => {
      const fibreMeasurements = measurementsByFibre.get(fibre.id) || [];
      if (fibreMeasurements.length >= HISTORICAL_POINTS_PER_FIBRE) {
        return;
      }

      const latestMeasurement = fibreMeasurements[fibreMeasurements.length - 1] || null;
      const baseAttenuation =
        (latestMeasurement?.get('attenuation') as number | null | undefined) ?? buildFallbackAttenuation(fibre);
      const wavelength =
        (latestMeasurement?.get('wavelength') as 1310 | 1550 | 1625 | null | undefined) || NORMAL_WAVELENGTH;
      const latestTimestamp = latestMeasurement
        ? new Date(latestMeasurement.get('timestamp') as Date)
        : new Date();
      const pointsToCreate = HISTORICAL_POINTS_PER_FIBRE - fibreMeasurements.length;

      for (let step = pointsToCreate; step >= 1; step -= 1) {
        const timestamp = new Date(latestTimestamp.getTime() - step * HISTORICAL_SPACING_MS);
        const attenuation = buildHistoricalAttenuation(baseAttenuation, fibre.status, step, pointsToCreate);

        historyRecords.push({
          fibreId: fibre.id,
          attenuation,
          testResult: inferTestResult(attenuation, fibre.status),
          wavelength,
          timestamp,
        });
      }
    });

    if (historyRecords.length > 0) {
      await Measurement.bulkCreate(historyRecords);
    }

    this.measurementHistorySeeded = true;
  }

  async triggerIncidentByIp(
    ipAddress: string,
    incidentType?: EmulatorIncidentType,
    manual = true
  ): Promise<SupervisionTelemetryBundle | null> {
    const normalizedIp = normalizeIp(ipAddress);
    if (!normalizedIp) {
      return null;
    }

    if (!databaseState.connected) {
      return lookupTelemetryBundleByIp(normalizedIp);
    }

    const rtu = await RTU.findOne({ where: { ipAddress: normalizedIp } });
    if (!rtu) {
      return null;
    }

    if (incidentRegistry.findByRtuId(rtu.id)) {
      return lookupTelemetryBundleByIp(normalizedIp);
    }

    await this.startIncident(rtu, incidentType, manual);
    return lookupTelemetryBundleByIp(normalizedIp);
  }

  private async tick(): Promise<void> {
    if (!this.running || !databaseState.connected) {
      return;
    }

    this.lastTickAt = new Date();
    await this.resolveDueIncidents();

    if (incidentRegistry.count() >= emulatorConfig.maxConcurrentIncidents) {
      return;
    }

    if (Math.random() > emulatorConfig.incidentChancePerTick) {
      return;
    }

    const rtus = await RTU.findAll({ order: [['id', 'ASC']] });
    const candidate = rtus
      .filter((rtu) => rtu.status === 'online' || rtu.status === 'warning')
      .find((rtu) => !incidentRegistry.findByRtuId(rtu.id));

    if (!candidate) {
      return;
    }

    await this.startIncident(candidate, undefined, false);
  }

  private nextIncidentType(): EmulatorIncidentType {
    const sequence: EmulatorIncidentType[] = ['temperature', 'high-loss', 'rtu-down', 'fiber-cut'];
    const type = sequence[this.cycleIndex % sequence.length];
    this.cycleIndex += 1;
    return type;
  }

  private async startIncident(rtu: RTU, incidentType?: EmulatorIncidentType, manual = false): Promise<void> {
    const type = incidentType || this.nextIncidentType();
    const fibre = await Fibre.findOne({ where: { rtuId: rtu.id }, order: [['id', 'ASC']] });
    const now = new Date();
    const plannedResolutionAt = new Date(now.getTime() + getRandomIncidentDurationMs());

    const previousRtuState = {
      status: rtu.status,
      ...(rtu.power ? { power: rtu.power } : {}),
      ...(typeof rtu.temperature === 'number' ? { temperature: rtu.temperature } : {}),
      ...(rtu.otdrStatus ? { otdrStatus: rtu.otdrStatus } : {}),
      ...(typeof rtu.attenuationDb === 'number' ? { attenuationDb: rtu.attenuationDb } : {}),
      ...(rtu.lastSeen ? { lastSeen: new Date(rtu.lastSeen) } : {}),
    };

    const previousFibreState = fibre
      ? {
          status: fibre.status,
        }
      : undefined;

    const alarmType: SupervisionAlarmType =
      type === 'fiber-cut' ? 'Fiber Cut' : type === 'high-loss' ? 'High Loss' : type === 'rtu-down' ? 'RTU Down' : 'Temperature';
    const severity: SupervisionAlarmSeverity =
      type === 'fiber-cut' || type === 'rtu-down' ? 'critical' : type === 'temperature' ? 'major' : 'major';

    const updatedRtu = await rtu.update(
      type === 'rtu-down'
        ? {
            status: 'offline' as SupervisionRtuStatus,
            power: 'failure' as SupervisionPowerStatus,
            otdrStatus: 'fault',
            lastSeen: now,
          }
        : type === 'temperature'
          ? {
              status: 'warning',
              power: rtu.power || 'normal',
              temperature: Math.max((rtu.temperature || emulatorConfig.temperatureWarningC) + 6, emulatorConfig.temperatureWarningC + 1),
              otdrStatus: 'busy',
              lastSeen: now,
            }
          : {
              status: 'warning',
              otdrStatus: type === 'fiber-cut' ? 'fault' : 'busy',
              lastSeen: now,
            }
    );

    let updatedFibre: Fibre | null = null;
    if (fibre) {
      updatedFibre = await fibre.update(
        type === 'fiber-cut'
          ? { status: 'broken' }
          : type === 'high-loss'
            ? { status: 'degraded' }
            : { status: fibre.status }
      );
    }

    const alarm = await Alarm.create({
      rtuId: rtu.id,
      ...(fibre ? { fibreId: fibre.id, routeId: fibre.id } : {}),
      alarmType,
      severity,
      lifecycleStatus: 'active',
      message:
        type === 'fiber-cut'
          ? `Fiber cut detected on ${rtu.name}${fibre ? ` ${fibre.name}` : ''}.`
          : type === 'high-loss'
            ? `High loss detected on ${rtu.name}${fibre ? ` ${fibre.name}` : ''}.`
            : type === 'rtu-down'
              ? `RTU ${rtu.name} is offline or unreachable.`
              : `Temperature anomaly detected on ${rtu.name}.`,
      location: rtu.locationAddress || rtu.name,
      localizationKm: fibre?.length ? `KM ${fibre.length.toFixed(1)}` : undefined,
      owner: manual ? 'Manual Emulator Trigger' : 'Supervision Emulator',
      occurredAt: now,
    });

    const incident: SupervisionIncidentRecord = {
      key: String(rtu.id),
      rtuId: rtu.id,
      ipAddress: rtu.ipAddress || '',
      ...(fibre ? { fibreId: fibre.id, routeId: fibre.id } : {}),
      alarmId: alarm.id,
      alarmType,
      severity,
      startedAt: now.toISOString(),
      plannedResolutionAt: plannedResolutionAt.toISOString(),
      manual,
      source: 'emulator',
      previousRtuState,
      previousFibreState,
    };

    incidentRegistry.upsert(incident);

    emitEvent('incident_started', {
      incident,
      alarm: plain(alarm),
      rtu: plain(updatedRtu),
      fibre: updatedFibre ? plain(updatedFibre) : null,
    });
    emitEvent('alarm_updated', plain(alarm));
    emitEvent('rtu_updated', plain(updatedRtu));
    if (updatedFibre) {
      emitEvent('fibre_updated', plain(updatedFibre));
    }

    const bundle = await lookupTelemetryBundleByIp(rtu.ipAddress || '');
    if (bundle) {
      emitEvent('telemetry_bundle', bundle);
    }
  }

  private async resolveDueIncidents(): Promise<void> {
    const now = Date.now();
    for (const incident of incidentRegistry.list()) {
      if (new Date(incident.plannedResolutionAt).getTime() <= now) {
        await this.resolveIncident(incident.key);
      }
    }
  }

  private async resolveIncident(key: string): Promise<void> {
    const incident = incidentRegistry.get(key);
    if (!incident || !databaseState.connected) {
      incidentRegistry.remove(key);
      return;
    }

    const alarm = incident.alarmId ? await Alarm.findByPk(incident.alarmId) : null;
    const rtu = await RTU.findByPk(incident.rtuId);
    const fibre = incident.fibreId ? await Fibre.findByPk(incident.fibreId) : null;
    const now = new Date();

    if (alarm) {
      await alarm.update({
        lifecycleStatus: 'resolved',
        resolvedAt: now,
        resolutionComment: 'Auto-resolved by supervision emulator',
      });
    }

    if (rtu && incident.previousRtuState) {
      await rtu.update(incident.previousRtuState);
      emitEvent('rtu_updated', plain(rtu));
    }

    if (fibre && incident.previousFibreState) {
      await fibre.update(incident.previousFibreState);
      emitEvent('fibre_updated', plain(fibre));
    }

    if (fibre) {
      await Measurement.create({
        fibreId: fibre.id,
        attenuation: Math.max((fibre.length || 10) / 5, 2.5),
        testResult: 'pass',
        wavelength: NORMAL_WAVELENGTH,
        timestamp: now,
      });

      await OtdrTestResult.create({
        rtuId: rtu?.id,
        routeId: fibre.id,
        mode: 'scheduled',
        pulseWidth: fibre.length && fibre.length >= 20 ? '50 ns' : '30 ns',
        dynamicRangeDb: 24,
        wavelengthNm: NORMAL_WAVELENGTH,
        result: 'pass',
        testedAt: now,
      });
    }

    const snapshot = await buildTelemetryBundleForDashboard();
    await persistDashboardSnapshot(snapshot);
    if (fibre) {
      await persistPerformanceSnapshot({
        fibreId: fibre.id,
        mttrHours: snapshot.mttrHours,
        mtbfHours: snapshot.mtbfHours,
        recordedAt: now,
      });
    }

    if (alarm) {
      emitEvent('alarm_updated', plain(alarm));
    }
    emitEvent('incident_resolved', {
      incident: {
        ...incident,
        resolvedAt: now.toISOString(),
      },
      alarm: alarm ? plain(alarm) : null,
      rtu: rtu ? plain(rtu) : null,
      fibre: fibre ? plain(fibre) : null,
    });
    emitEvent('kpi_updated', snapshot);

    if (rtu?.ipAddress) {
      const bundle = await lookupTelemetryBundleByIp(rtu.ipAddress);
      if (bundle) {
        emitEvent('telemetry_bundle', bundle);
      }
    }

    incidentRegistry.remove(key);
  }
}

export const supervisionEmulatorService = new SupervisionEmulatorService();

export default supervisionEmulatorService;
