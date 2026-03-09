import {
  AlarmLifecycleStatus,
  AlarmSeverity,
  CommunicationStatus,
  FiberStatus,
  OtdrAvailabilityStatus,
  PowerSupplyStatus,
  RiskLevel,
  RouteStatus,
  RTUStatus,
  TestMode,
  TestResult,
} from '../types';

export interface RtuInventoryRecord {
  id: number;
  name: string;
  zone: string;
  vendor: string;
  ipAddress: string;
  status: RTUStatus;
  powerSupply: PowerSupplyStatus;
  communication: CommunicationStatus;
  otdrAvailability: OtdrAvailabilityStatus;
  temperature: number;
  uptimePercent: number;
  opticalBudgetDb: number;
  activeAlarms: number;
  lastSeen: string;
}

export const rtuInventoryRecords: RtuInventoryRecord[] = [
  {
    id: 1,
    name: 'RTU-PAR-001',
    zone: 'Paris North',
    vendor: 'EXFO',
    ipAddress: '10.42.1.11',
    status: RTUStatus.ONLINE,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.READY,
    temperature: 31,
    uptimePercent: 99.6,
    opticalBudgetDb: 18.2,
    activeAlarms: 0,
    lastSeen: '2 min ago',
  },
  {
    id: 2,
    name: 'RTU-PAR-014',
    zone: 'Paris East',
    vendor: 'Viavi',
    ipAddress: '10.42.1.29',
    status: RTUStatus.WARNING,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.BUSY,
    temperature: 42,
    uptimePercent: 96.1,
    opticalBudgetDb: 21.7,
    activeAlarms: 2,
    lastSeen: '30 sec ago',
  },
  {
    id: 3,
    name: 'RTU-LIL-004',
    zone: 'Lille Core',
    vendor: 'Yokogawa',
    ipAddress: '10.43.2.9',
    status: RTUStatus.ONLINE,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.READY,
    temperature: 29,
    uptimePercent: 99.8,
    opticalBudgetDb: 16.9,
    activeAlarms: 0,
    lastSeen: '1 min ago',
  },
  {
    id: 4,
    name: 'RTU-MRS-003',
    zone: 'Marseille West',
    vendor: 'EXFO',
    ipAddress: '10.44.6.5',
    status: RTUStatus.OFFLINE,
    powerSupply: PowerSupplyStatus.FAILURE,
    communication: CommunicationStatus.DISCONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.FAULT,
    temperature: 0,
    uptimePercent: 87.5,
    opticalBudgetDb: 0,
    activeAlarms: 4,
    lastSeen: '43 min ago',
  },
  {
    id: 5,
    name: 'RTU-LYO-007',
    zone: 'Lyon South',
    vendor: 'Viavi',
    ipAddress: '10.45.4.17',
    status: RTUStatus.ONLINE,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.READY,
    temperature: 34,
    uptimePercent: 98.9,
    opticalBudgetDb: 19.8,
    activeAlarms: 1,
    lastSeen: '2 min ago',
  },
  {
    id: 6,
    name: 'RTU-BDX-002',
    zone: 'Bordeaux Hub',
    vendor: 'Anritsu',
    ipAddress: '10.46.2.3',
    status: RTUStatus.WARNING,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.BUSY,
    temperature: 39,
    uptimePercent: 95.4,
    opticalBudgetDb: 22.3,
    activeAlarms: 2,
    lastSeen: '58 sec ago',
  },
  {
    id: 7,
    name: 'RTU-NAN-011',
    zone: 'Nantes Metro',
    vendor: 'EXFO',
    ipAddress: '10.47.3.41',
    status: RTUStatus.ONLINE,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.CONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.READY,
    temperature: 30,
    uptimePercent: 99.1,
    opticalBudgetDb: 17.6,
    activeAlarms: 0,
    lastSeen: '3 min ago',
  },
  {
    id: 8,
    name: 'RTU-TOU-006',
    zone: 'Toulouse South',
    vendor: 'Viavi',
    ipAddress: '10.48.1.78',
    status: RTUStatus.UNREACHABLE,
    powerSupply: PowerSupplyStatus.NORMAL,
    communication: CommunicationStatus.DISCONNECTED,
    otdrAvailability: OtdrAvailabilityStatus.FAULT,
    temperature: 36,
    uptimePercent: 82.2,
    opticalBudgetDb: 0,
    activeAlarms: 3,
    lastSeen: '16 min ago',
  },
];

export interface FiberRouteRecord {
  id: number;
  routeName: string;
  source: string;
  destination: string;
  fiberStatus: FiberStatus;
  routeStatus: RouteStatus;
  lengthKm: number;
  attenuationDb: number;
  reflectionEvents: boolean;
  lastTestTime: string;
}

export const fiberRouteRecords: FiberRouteRecord[] = [
  {
    id: 1,
    routeName: 'PAR-NORTH-CORE',
    source: 'POP-A',
    destination: 'POP-D',
    fiberStatus: FiberStatus.NORMAL,
    routeStatus: RouteStatus.ACTIVE,
    lengthKm: 33.4,
    attenuationDb: 16.1,
    reflectionEvents: false,
    lastTestTime: '2026-03-09 14:20',
  },
  {
    id: 2,
    routeName: 'PAR-EAST-RING',
    source: 'POP-D',
    destination: 'POP-F',
    fiberStatus: FiberStatus.DEGRADED,
    routeStatus: RouteStatus.ACTIVE,
    lengthKm: 27.8,
    attenuationDb: 21.9,
    reflectionEvents: true,
    lastTestTime: '2026-03-09 14:12',
  },
  {
    id: 3,
    routeName: 'MRS-WEST-BACKBONE',
    source: 'POP-K',
    destination: 'POP-M',
    fiberStatus: FiberStatus.BROKEN,
    routeStatus: RouteStatus.INACTIVE,
    lengthKm: 40.1,
    attenuationDb: 0,
    reflectionEvents: true,
    lastTestTime: '2026-03-09 13:31',
  },
  {
    id: 4,
    routeName: 'LYO-METRO-02',
    source: 'POP-L2',
    destination: 'POP-L8',
    fiberStatus: FiberStatus.NORMAL,
    routeStatus: RouteStatus.ACTIVE,
    lengthKm: 18.9,
    attenuationDb: 14.7,
    reflectionEvents: false,
    lastTestTime: '2026-03-09 14:28',
  },
  {
    id: 5,
    routeName: 'BDX-HUB-SPUR',
    source: 'POP-B1',
    destination: 'POP-B4',
    fiberStatus: FiberStatus.DEGRADED,
    routeStatus: RouteStatus.SKIPPED,
    lengthKm: 12.6,
    attenuationDb: 20.4,
    reflectionEvents: true,
    lastTestTime: '2026-03-09 12:57',
  },
];

export interface OtdrTestRecord {
  id: number;
  routeName: string;
  mode: TestMode;
  pulseWidth: string;
  dynamicRangeDb: number;
  wavelengthNm: 1310 | 1550 | 1625;
  result: TestResult;
  testedAt: string;
}

export const otdrRecentTests: OtdrTestRecord[] = [
  {
    id: 501,
    routeName: 'PAR-NORTH-CORE',
    mode: TestMode.SCHEDULED,
    pulseWidth: '100 ns',
    dynamicRangeDb: 39,
    wavelengthNm: 1550,
    result: TestResult.PASS,
    testedAt: '2026-03-09 14:20',
  },
  {
    id: 502,
    routeName: 'PAR-EAST-RING',
    mode: TestMode.AUTO,
    pulseWidth: '500 ns',
    dynamicRangeDb: 37,
    wavelengthNm: 1625,
    result: TestResult.FAIL,
    testedAt: '2026-03-09 14:12',
  },
  {
    id: 503,
    routeName: 'LYO-METRO-02',
    mode: TestMode.MANUAL,
    pulseWidth: '50 ns',
    dynamicRangeDb: 35,
    wavelengthNm: 1310,
    result: TestResult.PASS,
    testedAt: '2026-03-09 14:07',
  },
  {
    id: 504,
    routeName: 'MRS-WEST-BACKBONE',
    mode: TestMode.MANUAL,
    pulseWidth: '1 us',
    dynamicRangeDb: 41,
    wavelengthNm: 1550,
    result: TestResult.FAIL,
    testedAt: '2026-03-09 13:31',
  },
];

export interface AttenuationSeriesPoint {
  slot: string;
  backboneNorth: number;
  backboneSouth: number;
  metroRing: number;
}

export const attenuationSeries: AttenuationSeriesPoint[] = [
  { slot: '08:00', backboneNorth: 14.9, backboneSouth: 16.3, metroRing: 13.8 },
  { slot: '09:00', backboneNorth: 15.1, backboneSouth: 16.8, metroRing: 14.1 },
  { slot: '10:00', backboneNorth: 15.6, backboneSouth: 17.2, metroRing: 14.5 },
  { slot: '11:00', backboneNorth: 16.0, backboneSouth: 17.5, metroRing: 14.4 },
  { slot: '12:00', backboneNorth: 16.4, backboneSouth: 18.2, metroRing: 14.8 },
  { slot: '13:00', backboneNorth: 16.7, backboneSouth: 18.5, metroRing: 15.1 },
  { slot: '14:00', backboneNorth: 16.2, backboneSouth: 17.9, metroRing: 14.9 },
  { slot: '15:00', backboneNorth: 15.8, backboneSouth: 17.3, metroRing: 14.6 },
];

export interface MonitoringNode {
  id: number;
  name: string;
  status: RTUStatus;
  packetLossPercent: number;
  cpuPercent: number;
  latencyMs: number;
  signalDbm: number;
}

export const monitoringNodes: MonitoringNode[] = [
  { id: 1, name: 'PAR-CORE-01', status: RTUStatus.ONLINE, packetLossPercent: 0.2, cpuPercent: 48, latencyMs: 12, signalDbm: -15.1 },
  { id: 2, name: 'PAR-EDGE-07', status: RTUStatus.WARNING, packetLossPercent: 1.3, cpuPercent: 74, latencyMs: 23, signalDbm: -19.4 },
  { id: 3, name: 'LIL-CORE-02', status: RTUStatus.ONLINE, packetLossPercent: 0.1, cpuPercent: 41, latencyMs: 10, signalDbm: -14.3 },
  { id: 4, name: 'MRS-EDGE-03', status: RTUStatus.OFFLINE, packetLossPercent: 100, cpuPercent: 0, latencyMs: 0, signalDbm: -99 },
  { id: 5, name: 'LYO-CORE-05', status: RTUStatus.ONLINE, packetLossPercent: 0.3, cpuPercent: 53, latencyMs: 14, signalDbm: -16.8 },
  { id: 6, name: 'BDX-EDGE-09', status: RTUStatus.WARNING, packetLossPercent: 1.8, cpuPercent: 69, latencyMs: 27, signalDbm: -20.6 },
];

export interface LiveEvent {
  id: string;
  timestamp: string;
  severity: AlarmSeverity;
  message: string;
  source: string;
}

export const liveEvents: LiveEvent[] = [
  {
    id: 'evt-001',
    timestamp: '15:42:16',
    severity: AlarmSeverity.CRITICAL,
    message: 'Power loss on feeder segment F-204',
    source: 'MRS-EDGE-03',
  },
  {
    id: 'evt-002',
    timestamp: '15:39:22',
    severity: AlarmSeverity.MAJOR,
    message: 'Unexpected attenuation increase above 2.5 dB',
    source: 'PAR-EDGE-07',
  },
  {
    id: 'evt-003',
    timestamp: '15:35:10',
    severity: AlarmSeverity.MINOR,
    message: 'Temperature drift detected',
    source: 'BDX-EDGE-09',
  },
  {
    id: 'evt-004',
    timestamp: '15:29:01',
    severity: AlarmSeverity.INFO,
    message: 'Automatic threshold recalibration completed',
    source: 'LIL-CORE-02',
  },
];

export interface AlarmRecord {
  id: number;
  severity: AlarmSeverity;
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  message: string;
  zone: string;
  rtuName: string;
  occurredAt: string;
  elapsed: string;
  owner: string;
  lifecycleStatus: AlarmLifecycleStatus;
  localizationKm: string;
}

export const alarmRecords: AlarmRecord[] = [
  {
    id: 1001,
    severity: AlarmSeverity.CRITICAL,
    alarmType: 'RTU Down',
    message: 'RTU power supply unavailable',
    zone: 'Marseille West',
    rtuName: 'RTU-MRS-003',
    occurredAt: '2026-03-09 15:01',
    elapsed: '43 min',
    owner: 'NOC L2',
    lifecycleStatus: AlarmLifecycleStatus.ACKNOWLEDGED,
    localizationKm: 'KM 40.8',
  },
  {
    id: 1002,
    severity: AlarmSeverity.CRITICAL,
    alarmType: 'Fiber Cut',
    message: 'Optical signal dropped below -35 dBm',
    zone: 'Paris East',
    rtuName: 'RTU-PAR-014',
    occurredAt: '2026-03-09 15:16',
    elapsed: '28 min',
    owner: 'Field Team Alpha',
    lifecycleStatus: AlarmLifecycleStatus.ACTIVE,
    localizationKm: 'KM 22.3',
  },
  {
    id: 1003,
    severity: AlarmSeverity.MAJOR,
    alarmType: 'High Loss',
    message: 'Trend slope exceeded warning profile',
    zone: 'Bordeaux Hub',
    rtuName: 'RTU-BDX-002',
    occurredAt: '2026-03-09 15:25',
    elapsed: '19 min',
    owner: 'NOC L1',
    lifecycleStatus: AlarmLifecycleStatus.ACKNOWLEDGED,
    localizationKm: 'KM 9.4',
  },
  {
    id: 1004,
    severity: AlarmSeverity.MAJOR,
    alarmType: 'Temperature',
    message: 'Cabinet temperature over 40 C',
    zone: 'Paris East',
    rtuName: 'RTU-PAR-014',
    occurredAt: '2026-03-09 15:32',
    elapsed: '12 min',
    owner: 'NOC L1',
    lifecycleStatus: AlarmLifecycleStatus.ACTIVE,
    localizationKm: 'KM 20.7',
  },
  {
    id: 1005,
    severity: AlarmSeverity.MINOR,
    alarmType: 'High Loss',
    message: 'Clock drift exceeds 25 ms',
    zone: 'Lyon South',
    rtuName: 'RTU-LYO-007',
    occurredAt: '2026-03-09 15:36',
    elapsed: '8 min',
    owner: 'Automation Bot',
    lifecycleStatus: AlarmLifecycleStatus.CLEARED,
    localizationKm: 'KM 4.1',
  },
  {
    id: 1006,
    severity: AlarmSeverity.INFO,
    alarmType: 'Maintenance',
    message: 'Scheduled OTDR run started',
    zone: 'Nantes Metro',
    rtuName: 'RTU-NAN-011',
    occurredAt: '2026-03-09 15:42',
    elapsed: '2 min',
    owner: 'Scheduler',
    lifecycleStatus: AlarmLifecycleStatus.CLEARED,
    localizationKm: 'N/A',
  },
];

export interface AlarmZoneVolume {
  zone: string;
  critical: number;
  major: number;
  minor: number;
}

export const alarmZoneVolumes: AlarmZoneVolume[] = [
  { zone: 'Paris East', critical: 2, major: 2, minor: 1 },
  { zone: 'Marseille West', critical: 1, major: 1, minor: 0 },
  { zone: 'Bordeaux Hub', critical: 0, major: 1, minor: 2 },
  { zone: 'Lyon South', critical: 0, major: 1, minor: 1 },
];

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  frequency: string;
  owner: string;
  status: 'Healthy' | 'Attention';
  lastRun: string;
}

export const reportTemplates: ReportTemplate[] = [
  {
    id: 'tpl-availability',
    name: 'Network Availability',
    description: 'SLA summary by zone with downtime root causes.',
    frequency: 'Daily 07:00',
    owner: 'NOC Ops',
    status: 'Healthy',
    lastRun: 'Today 07:01',
  },
  {
    id: 'tpl-fiber-health',
    name: 'Fiber Health Trend',
    description: 'Attenuation and anomaly trend over the last 30 days.',
    frequency: 'Weekly Mon 08:30',
    owner: 'Fiber Team',
    status: 'Healthy',
    lastRun: 'Mon 08:33',
  },
  {
    id: 'tpl-alarm-audit',
    name: 'Alarm Audit',
    description: 'Critical and major alarms with acknowledgement delay.',
    frequency: 'Daily 18:00',
    owner: 'Service Quality',
    status: 'Attention',
    lastRun: 'Yesterday 18:05',
  },
];

export interface GeneratedReport {
  id: string;
  fileName: string;
  period: string;
  generatedAt: string;
  generatedBy: string;
  size: string;
  status: 'Ready' | 'Building';
}

export const generatedReports: GeneratedReport[] = [
  {
    id: 'rep-001',
    fileName: 'availability-week-10.pdf',
    period: 'Week 10',
    generatedAt: 'Today 09:14',
    generatedBy: 'NOC Ops',
    size: '4.8 MB',
    status: 'Ready',
  },
  {
    id: 'rep-002',
    fileName: 'alarms-daily-2026-03-08.csv',
    period: '2026-03-08',
    generatedAt: 'Today 07:02',
    generatedBy: 'Scheduler',
    size: '1.1 MB',
    status: 'Ready',
  },
  {
    id: 'rep-003',
    fileName: 'fiber-health-monthly-mar.pdf',
    period: 'March 2026',
    generatedAt: 'Today 15:20',
    generatedBy: 'Fiber Team',
    size: '7.3 MB',
    status: 'Building',
  },
];

export interface NetworkPerformancePoint {
  month: string;
  availability: number;
  mttr: number;
  mtbf: number;
  criticalAlarms: number;
}

export const networkPerformanceSeries: NetworkPerformancePoint[] = [
  { month: 'Oct', availability: 99.1, mttr: 3.3, mtbf: 101, criticalAlarms: 15 },
  { month: 'Nov', availability: 99.2, mttr: 3.1, mtbf: 108, criticalAlarms: 13 },
  { month: 'Dec', availability: 99.3, mttr: 2.9, mtbf: 116, criticalAlarms: 11 },
  { month: 'Jan', availability: 99.4, mttr: 2.8, mtbf: 124, criticalAlarms: 10 },
  { month: 'Feb', availability: 99.5, mttr: 2.6, mtbf: 132, criticalAlarms: 8 },
  { month: 'Mar', availability: 99.6, mttr: 2.4, mtbf: 141, criticalAlarms: 6 },
];

export interface ScheduledReport {
  id: string;
  title: string;
  schedule: string;
  recipients: number;
}

export const scheduledReports: ScheduledReport[] = [
  { id: 'sch-001', title: 'Daily Availability Pack', schedule: 'Every day 07:00', recipients: 12 },
  { id: 'sch-002', title: 'Weekly Fiber Health', schedule: 'Monday 08:30', recipients: 7 },
  { id: 'sch-003', title: 'Monthly Executive Summary', schedule: '1st day 09:00', recipients: 4 },
];

export interface QualityKpi {
  id: string;
  label: string;
  value: string;
  trend: string;
  criticality: 'Critique' | 'Moyenne' | 'Faible';
}

export const qualityKpis: QualityKpi[] = [
  { id: 'q-1', label: 'MTTR', value: '2.4 h', trend: '-0.4 h vs last month', criticality: 'Moyenne' },
  { id: 'q-2', label: 'MTBF', value: '141 h', trend: '+9 h vs last month', criticality: 'Faible' },
  { id: 'q-3', label: 'Attenuation Drift', value: '0.22 dB/day', trend: 'Stable', criticality: 'Moyenne' },
  { id: 'q-4', label: 'SLA Availability', value: '99.6%', trend: '+0.1%', criticality: 'Critique' },
];

export interface NqmsMatrixRow {
  domain: 'RTU' | 'Fibre' | 'OTDR' | 'Alarmes' | 'Performance';
  parameter: string;
  description: string;
  values: string;
  widgetType: string;
  criticality: 'Critique' | 'Moyenne' | 'Faible';
}

export const nqmsMatrixRows: NqmsMatrixRow[] = [
  {
    domain: 'RTU',
    parameter: 'RTU Status',
    description: 'Etat global de la RTU',
    values: 'Online / Offline / Unreachable',
    widgetType: 'Tuile / LED',
    criticality: 'Critique',
  },
  {
    domain: 'RTU',
    parameter: 'Power Supply',
    description: 'Etat alimentation RTU',
    values: 'Normal / Failure',
    widgetType: 'Tuile',
    criticality: 'Critique',
  },
  {
    domain: 'RTU',
    parameter: 'Temperature',
    description: 'Temperature interne RTU',
    values: 'Valeur C + seuils',
    widgetType: 'Jauge',
    criticality: 'Moyenne',
  },
  {
    domain: 'RTU',
    parameter: 'OTDR Availability',
    description: 'Disponibilite OTDR',
    values: 'Ready / Busy / Fault',
    widgetType: 'Icone statut',
    criticality: 'Critique',
  },
  {
    domain: 'Fibre',
    parameter: 'Fiber Status',
    description: 'Etat global de la fibre',
    values: 'Normal / Degraded / Broken',
    widgetType: 'Carte / Liste',
    criticality: 'Critique',
  },
  {
    domain: 'Fibre',
    parameter: 'Route Status',
    description: 'Etat de la route optique',
    values: 'Active / Inactive / Skipped',
    widgetType: 'Liste',
    criticality: 'Critique',
  },
  {
    domain: 'Fibre',
    parameter: 'Length',
    description: 'Longueur de la fibre',
    values: 'Valeur km',
    widgetType: 'Texte',
    criticality: 'Faible',
  },
  {
    domain: 'Fibre',
    parameter: 'Attenuation',
    description: 'Attenuation totale',
    values: 'dB seuil configurable',
    widgetType: 'Jauge',
    criticality: 'Critique',
  },
  {
    domain: 'OTDR',
    parameter: 'Test Mode',
    description: 'Mode de test OTDR',
    values: 'Auto / Manual / Scheduled',
    widgetType: 'Texte',
    criticality: 'Faible',
  },
  {
    domain: 'OTDR',
    parameter: 'Wavelength',
    description: 'Longueur d onde',
    values: '1310 / 1550 / 1625 nm',
    widgetType: 'Texte',
    criticality: 'Faible',
  },
  {
    domain: 'OTDR',
    parameter: 'Test Result',
    description: 'Resultat du test',
    values: 'Pass / Fail',
    widgetType: 'Tableau',
    criticality: 'Critique',
  },
  {
    domain: 'OTDR',
    parameter: 'Last Test Time',
    description: 'Horodatage dernier test',
    values: 'Date / Heure',
    widgetType: 'Texte',
    criticality: 'Moyenne',
  },
  {
    domain: 'Alarmes',
    parameter: 'Alarm Type',
    description: 'Type d alarme',
    values: 'Fiber Cut / High Loss / RTU Down',
    widgetType: 'Liste',
    criticality: 'Critique',
  },
  {
    domain: 'Alarmes',
    parameter: 'Severity',
    description: 'Niveau de severite',
    values: 'Critical / Major / Minor',
    widgetType: 'Heatmap',
    criticality: 'Critique',
  },
  {
    domain: 'Alarmes',
    parameter: 'Alarm Status',
    description: 'Etat de l alarme',
    values: 'Active / Acknowledged / Cleared',
    widgetType: 'Liste',
    criticality: 'Critique',
  },
  {
    domain: 'Alarmes',
    parameter: 'Localization',
    description: 'Localisation du defaut',
    values: 'Distance / Section',
    widgetType: 'Carte',
    criticality: 'Critique',
  },
  {
    domain: 'Performance',
    parameter: 'Attenuation Trend',
    description: 'Evolution attenuation',
    values: 'Graphique temporel',
    widgetType: 'Graphique',
    criticality: 'Moyenne',
  },
  {
    domain: 'Performance',
    parameter: 'MTTR',
    description: 'Temps moyen de reparation',
    values: 'Heures',
    widgetType: 'KPI',
    criticality: 'Moyenne',
  },
  {
    domain: 'Performance',
    parameter: 'MTBF',
    description: 'Temps moyen entre pannes',
    values: 'Heures',
    widgetType: 'KPI',
    criticality: 'Faible',
  },
];

export interface RiskTrendPoint {
  day: string;
  riskIndex: number;
  incidents: number;
}

export const aiRiskTrendSeries: RiskTrendPoint[] = [
  { day: 'Mon', riskIndex: 63, incidents: 7 },
  { day: 'Tue', riskIndex: 60, incidents: 6 },
  { day: 'Wed', riskIndex: 58, incidents: 6 },
  { day: 'Thu', riskIndex: 55, incidents: 5 },
  { day: 'Fri', riskIndex: 57, incidents: 5 },
  { day: 'Sat', riskIndex: 53, incidents: 4 },
  { day: 'Sun', riskIndex: 51, incidents: 4 },
];

export interface FeatureImportancePoint {
  feature: string;
  weight: number;
}

export const featureImportanceSeries: FeatureImportancePoint[] = [
  { feature: 'Attenuation Drift', weight: 34 },
  { feature: 'Alarm Burst 24h', weight: 22 },
  { feature: 'Uptime Deviation', weight: 18 },
  { feature: 'Temperature', weight: 14 },
  { feature: 'RTU Age', weight: 12 },
];

export interface AIPredictionRecord {
  id: number;
  rtuName: string;
  zone: string;
  probability: number;
  riskLevel: RiskLevel;
  horizonHours: number;
  primaryDriver: string;
}

export const aiPredictionRecords: AIPredictionRecord[] = [
  {
    id: 1,
    rtuName: 'RTU-PAR-014',
    zone: 'Paris East',
    probability: 0.82,
    riskLevel: RiskLevel.CRITICAL,
    horizonHours: 12,
    primaryDriver: 'Rapid attenuation + overheating',
  },
  {
    id: 2,
    rtuName: 'RTU-BDX-002',
    zone: 'Bordeaux Hub',
    probability: 0.68,
    riskLevel: RiskLevel.HIGH,
    horizonHours: 24,
    primaryDriver: 'Alarm burst and jitter growth',
  },
  {
    id: 3,
    rtuName: 'RTU-LYO-007',
    zone: 'Lyon South',
    probability: 0.44,
    riskLevel: RiskLevel.MEDIUM,
    horizonHours: 48,
    primaryDriver: 'Uptime degradation trend',
  },
  {
    id: 4,
    rtuName: 'RTU-NAN-011',
    zone: 'Nantes Metro',
    probability: 0.21,
    riskLevel: RiskLevel.LOW,
    horizonHours: 48,
    primaryDriver: 'Stable profile',
  },
];

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  version: string;
  lastTraining: string;
}

export const modelMetrics: ModelMetrics = {
  accuracy: 0.86,
  precision: 0.83,
  recall: 0.8,
  f1: 0.81,
  version: 'v2.0.4',
  lastTraining: '2026-03-05 02:30 UTC',
};

export const globalHealthScore = 84;