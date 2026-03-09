// ==================== ENUMS ====================

export enum RTUStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  WARNING = 'warning',
}

export enum AlarmSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  INFO = 'info',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ==================== INTERFACES ====================

export interface RTU {
  id: number;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  ipAddress: string;
  serialNumber: string;
  status: RTUStatus;
  temperature: number;
  installationDate: string;
  lastSeen: string;
  userId: number;
}

export interface Alarm {
  id: number;
  rtuId: number;
  rtuName: string;
  severity: AlarmSeverity;
  message: string;
  alarmType: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: number;
  resolvedAt?: string;
  resolutionComment?: string;
  location: string;
}

export interface Prediction {
  id: number;
  rtuId: number;
  rtuName: string;
  probability: number;
  riskLevel: RiskLevel;
  predictionHorizonHours: number;
  predictedAt: string;
  validUntil: string;
  features: {
    attenuationDb: number;
    nbAlarms24h: number;
    nbAlarms7d: number;
    uptimePercent: number;
    temperature: number;
    attenuationVariation: number;
    rtuAgeDays: number;
    fiberType: number;
  };
}

export interface HealthScore {
  id: number;
  rtuId: number | null;
  score: number;
  components: {
    probabilityWeight: number;
    probabilityScore: number;
    alarmsWeight: number;
    alarmsScore: number;
    attenuationWeight: number;
    attenuationScore: number;
    uptimeWeight: number;
    uptimeScore: number;
  };
  calculatedAt: string;
}

export interface DashboardStats {
  rtuOnline: number;
  rtuOffline: number;
  rtuWarning: number;
  rtuTotal: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  mttr: number;
  availability: number;
}