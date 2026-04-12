export type SupervisionDataOrigin = 'database' | 'demo' | 'emulator';

export type SupervisionRtuStatus = 'online' | 'offline' | 'warning' | 'unreachable';
export type SupervisionPowerStatus = 'normal' | 'failure';
export type SupervisionOtdrStatus = 'ready' | 'busy' | 'fault';
export type SupervisionFibreStatus = 'normal' | 'degraded' | 'broken';
export type SupervisionRouteStatus = 'active' | 'inactive' | 'skipped';
export type SupervisionOtdrMode = 'auto' | 'manual' | 'scheduled';
export type SupervisionOtdrResult = 'pass' | 'fail';
export type SupervisionAlarmSeverity = 'critical' | 'major' | 'minor' | 'info';
export type SupervisionAlarmLifecycle = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'cleared';
export type SupervisionAlarmType = 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
export type SupervisionAttenuationTrend = 'rising' | 'stable' | 'falling';

export interface SupervisionCoordinates {
  latitude: number;
  longitude: number;
}

export interface SupervisionRtuRecord {
  id: number;
  name: string;
  locationAddress?: string | null;
  ipAddress?: string | null;
  serialNumber?: string | null;
  status: SupervisionRtuStatus;
  power?: SupervisionPowerStatus | null;
  temperature?: number | null;
  otdrStatus?: SupervisionOtdrStatus | null;
  attenuationDb?: number | null;
  lastSeen?: string | Date | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface SupervisionFibreRecord {
  id: number;
  rtuId: number;
  name: string;
  length?: number | null;
  status: SupervisionFibreStatus;
}

export interface SupervisionMeasurementRecord {
  id: number;
  fibreId: number;
  attenuation?: number | null;
  testResult: SupervisionOtdrResult;
  wavelength: 1310 | 1550 | 1625;
  timestamp: string | Date;
}

export interface SupervisionPerformanceRecord {
  id: number;
  fibreId: number;
  mttr?: number | null;
  mtbf?: number | null;
  recordedAt: string | Date;
}

export interface SupervisionAlarmRecord {
  id: number;
  rtuId?: number | null;
  fibreId?: number | null;
  routeId?: number | null;
  alarmType: SupervisionAlarmType;
  severity: SupervisionAlarmSeverity;
  lifecycleStatus: SupervisionAlarmLifecycle;
  message: string;
  location?: string | null;
  localizationKm?: string | null;
  owner?: string | null;
  occurredAt: string | Date;
  acknowledgedAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolutionComment?: string | null;
}

export interface SupervisionTelemetryFibre {
  id: number;
  fibreId: number;
  rtuId: number;
  sourceRtuId: number;
  destinationRtuId?: number | null;
  routeName: string;
  source: string;
  destination: string;
  fiberStatus: SupervisionFibreStatus;
  routeStatus: SupervisionRouteStatus;
  lengthKm?: number | null;
  attenuationDb?: number | null;
  attenuationTrend: SupervisionAttenuationTrend;
  testMode: SupervisionOtdrMode;
  wavelengthNm: 1310 | 1550 | 1625;
  testResult: SupervisionOtdrResult;
  lastTestTime?: string | Date | null;
  reflectionEvents: boolean;
  agingStatus: 'Stable' | 'Dégradé';
  path?: SupervisionCoordinates[] | null;
}

export interface SupervisionTelemetryAlarm extends SupervisionAlarmRecord {
  source: SupervisionDataOrigin;
}

export interface SupervisionDashboardFormulaNotes {
  mttr: string;
  mtbf: string;
  availability: string;
  attenuation: string;
  otdrFailures: string;
  fibreStatus: string;
}

export interface SupervisionDashboardSnapshot {
  rtuOnline: number;
  rtuOffline: number;
  rtuWarning: number;
  rtuUnreachable: number;
  rtuTotal: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  openAlarms: number;
  brokenFibres: number;
  degradedFibres: number;
  otdrFailures: number;
  averageAttenuationDb: number;
  mttrHours: number;
  mtbfHours: number;
  availabilityPercent: number;
  incidentLoad: number;
  source: SupervisionDataOrigin;
  generatedAt: string;
  formulaNotes: SupervisionDashboardFormulaNotes;
}

export interface SupervisionRtuSummary {
  activeAlarms: number;
  criticalAlarms: number;
  brokenFibres: number;
  degradedFibres: number;
  averageAttenuationDb: number;
  otdrAvailabilityStatus: SupervisionOtdrStatus;
  latestTestResult: SupervisionOtdrResult | null;
  latestTestTime: string | null;
  healthScore: number;
}

export interface SupervisionTelemetryBundle {
  ipAddress: string;
  source: SupervisionDataOrigin;
  generatedAt: string;
  rtu: SupervisionRtuRecord;
  fibres: SupervisionTelemetryFibre[];
  alarms: SupervisionTelemetryAlarm[];
  kpis: SupervisionDashboardSnapshot;
  summary: SupervisionRtuSummary;
}

export interface SupervisionEmulatorStatus {
  enabled: boolean;
  running: boolean;
  activeIncidents: number;
  tickIntervalMs: number;
  lastTickAt: string | null;
  nextTickAt: string | null;
  source: SupervisionDataOrigin;
}

export interface SupervisionKpiHistorySnapshot {
  id: number;
  rtuOnline: number;
  rtuOffline: number;
  rtuWarning: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  mttrHours: number;
  mtbfHours: number;
  availabilityPercent: number;
  capturedAt: string;
}

export interface SupervisionPerformanceHistorySnapshot {
  id: number;
  fibreId: number;
  mttrHours: number;
  mtbfHours: number;
  recordedAt: string;
}

export interface SupervisionDashboardHistoryResponse {
  snapshots: SupervisionKpiHistorySnapshot[];
  performances: SupervisionPerformanceHistorySnapshot[];
}

export interface SupervisionRouteAttenuationHistoryPoint {
  id: number;
  fibreId: number;
  attenuation: number;
  testResult: SupervisionOtdrResult;
  wavelength: 1310 | 1550 | 1625;
  timestamp: string;
}

export interface SupervisionRouteAttenuationHistoryResponse {
  routeId: number;
  source: SupervisionDataOrigin;
  degradedMode?: boolean;
  data: SupervisionRouteAttenuationHistoryPoint[];
}

export type SupervisionSocketEventName =
  | 'new_alarm'
  | 'alarm_updated'
  | 'rtu_updated'
  | 'fibre_updated'
  | 'incident_started'
  | 'incident_resolved'
  | 'kpi_updated'
  | 'telemetry_bundle';

export interface SupervisionIncidentSocketPayload {
  incident: unknown;
  alarm: unknown | null;
  rtu: unknown | null;
  fibre: unknown | null;
}

export interface SupervisionSocketEventMap {
  new_alarm: unknown;
  alarm_updated: unknown;
  rtu_updated: unknown;
  fibre_updated: unknown;
  incident_started: SupervisionIncidentSocketPayload;
  incident_resolved: SupervisionIncidentSocketPayload;
  kpi_updated: SupervisionDashboardSnapshot;
  telemetry_bundle: SupervisionTelemetryBundle;
}

export const SUPERVISION_CLOSED_ALARM_STATUSES: SupervisionAlarmLifecycle[] = ['resolved', 'closed', 'cleared'];

export const isClosedAlarmLifecycle = (status?: string | null): boolean =>
  Boolean(status && SUPERVISION_CLOSED_ALARM_STATUSES.includes(status as SupervisionAlarmLifecycle));

export const isOpenAlarmLifecycle = (status?: string | null): boolean =>
  Boolean(status && !isClosedAlarmLifecycle(status));
