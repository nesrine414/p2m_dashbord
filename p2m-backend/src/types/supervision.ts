export type SupervisionDataOrigin = 'database' | 'demo' | 'emulator';

export type SupervisionRtuStatus = 'online' | 'offline' | 'warning' | 'unreachable';
export type SupervisionPowerStatus = 'normal' | 'failure';
export type SupervisionOtdrStatus = 'ready' | 'busy' | 'fault';
export type SupervisionFibreStatus = 'normal' | 'degraded' | 'broken';
export type SupervisionRouteStatus = 'active' | 'inactive' | 'skipped';
export type SupervisionOtdrMode = 'auto' | 'manual' | 'scheduled';
export type SupervisionOtdrResult = 'pass' | 'fail';
export type SupervisionAlarmSeverity = 'critical' | 'major' | 'minor' | 'info';
export type SupervisionAlarmLifecycle = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
export type SupervisionAlarmType = 'Coupure Fibre' | 'Perte Elevée' | 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
export type SupervisionAttenuationTrend = 'rising' | 'stable' | 'falling';

export interface SupervisionCoordinates {
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface SupervisionRtuRecord extends SupervisionCoordinates {
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
  lastSeen?: Date | string | null;
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
  timestamp: Date | string;
}

export interface SupervisionPerformanceRecord {
  id: number;
  fibreId: number;
  mttr?: number | null;
  mtbf?: number | null;
  recordedAt: Date | string;
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
  occurredAt: Date | string;
  acknowledgedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  resolutionComment?: string | null;
}

export interface SupervisionRoutePathPoint {
  latitude: number;
  longitude: number;
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
  lastTestTime?: Date | string | null;
  reflectionEvents: boolean;
  agingStatus: 'Stable' | 'Dégradé';
  path?: SupervisionRoutePathPoint[] | null;
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
  mttrHours: number | null;
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

export interface SupervisionIncidentRecord {
  key: string;
  rtuId: number;
  ipAddress: string;
  fibreId?: number | null;
  routeId?: number | null;
  alarmId?: number | null;
  alarmType: SupervisionAlarmType;
  severity: SupervisionAlarmSeverity;
  startedAt: string;
  plannedResolutionAt: string;
  manual: boolean;
  source: SupervisionDataOrigin;
  previousRtuState?: {
    status?: SupervisionRtuStatus;
    power?: SupervisionPowerStatus;
    temperature?: number;
    otdrStatus?: SupervisionOtdrStatus;
    attenuationDb?: number;
    lastSeen?: Date;
  };
  previousFibreState?: {
    status?: SupervisionFibreStatus;
  };
}

export interface SupervisionKpiInput {
  rtus: SupervisionRtuRecord[];
  fibres: SupervisionFibreRecord[];
  alarms: SupervisionAlarmRecord[];
  measurements: SupervisionMeasurementRecord[];
  performances: SupervisionPerformanceRecord[];
  source: SupervisionDataOrigin;
}
