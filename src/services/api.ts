import axios from 'axios';
import { DashboardStats } from '../types';
import { getStoredToken } from './auth';
import { SupervisionTelemetryBundle } from '../types/liveSupervision';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN_KEY = 'nqms_auth_token';
const AUTH_EXEMPT_PATHS = new Set(['/login', '/register']);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);

      if (!AUTH_EXEMPT_PATHS.has(window.location.pathname)) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export interface BackendRTU {
  id: number;
  name: string;
  locationLatitude?: number | string | null;
  locationLongitude?: number | string | null;
  locationAddress?: string | null;
  ipAddress?: string | null;
  serialNumber?: string | null;
  status: 'online' | 'offline' | 'warning' | 'unreachable';
  temperature?: number | null;
  lastSeen?: string | Date | null;
}

export interface EmulatorMetricEvaluation {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string;
  status: 'normal' | 'warning' | 'critical' | 'info';
  thresholds?: {
    warning: number;
    critical: number;
  };
}

export interface EmulatorNumericThreshold {
  warning: number;
  critical: number;
  unit: string;
}

export interface EmulatorThresholdsConfig {
  rtu: {
    temperatureC: EmulatorNumericThreshold;
    heartbeatAgeMinutes: EmulatorNumericThreshold;
    averageAttenuationDb: EmulatorNumericThreshold;
  };
  fibre: {
    attenuationDb: EmulatorNumericThreshold;
    measurementAgeMinutes: EmulatorNumericThreshold;
  };
}

export interface EmulatorQueryResponse {
  requestedIpAddress: string;
  sampledAt: string;
  thresholdSource: string;
  rtu: {
    id: number;
    name: string;
    ipAddress: string;
    serialNumber?: string | null;
    locationAddress?: string | null;
    status: 'online' | 'offline' | 'warning' | 'unreachable';
    metrics: {
      power: 'normal' | 'failure';
      otdrStatus: 'ready' | 'busy' | 'fault' | null;
      temperatureC: number | null;
      heartbeatAgeMinutes: number;
      averageAttenuationDb: number | null;
    };
    evaluations: EmulatorMetricEvaluation[];
  };
  fibres: Array<{
    id: number;
    name: string;
    status: 'normal' | 'degraded' | 'broken';
    lengthKm: number | null;
    metrics: {
      attenuationDb: number | null;
      wavelength: 1310 | 1550 | 1625 | null;
      testResult: 'pass' | 'fail' | null;
      measurementAgeMinutes: number;
    };
    evaluations: EmulatorMetricEvaluation[];
  }>;
}

export interface BackendAlarm {
  id: number;
  rtuId?: number | null;
  rtuName?: string;
  zone?: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  lifecycleStatus: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'cleared';
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  message: string;
  location?: string | null;
  localizationKm?: string | null;
  owner?: string | null;
  occurredAt: string;
}

export interface BackendNotification {
  id: number;
  alarmId?: number | null;
  notificationType: 'alarm_new' | 'alarm_update' | 'system';
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendFiberRoute {
  id: number;
  routeName: string;
  source: string;
  destination: string;
  sourceRtuId?: number | null;
  destinationRtuId?: number | null;
  fiberStatus: 'normal' | 'degraded' | 'broken';
  routeStatus: 'active' | 'inactive' | 'skipped';
  path?: Array<[number, number]> | null;
  lengthKm?: number | null;
  attenuationDb?: number | null;
  reflectionEvents: boolean;
  lastTestTime?: string | null;
}

export interface BackendOtdrTest {
  id: number;
  routeId?: number | null;
  routeName: string;
  mode: 'auto' | 'manual' | 'scheduled';
  pulseWidth?: string | null;
  dynamicRangeDb?: number | null;
  wavelengthNm: 1310 | 1550 | 1625;
  result: 'pass' | 'fail';
  testedAt: string;
}

export interface RouteAttenuationTrendPoint {
  timestamp: string;
  attenuationDb: number | null;
  wavelengthNm: number;
  testResult: 'pass' | 'fail';
}

export interface RouteAttenuationTrendResponse {
  routeId: number;
  routeName: string;
  source: string;
  destination: string;
  windowMinutes: number;
  sampledAt: string;
  points: RouteAttenuationTrendPoint[];
  degradedMode?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  degradedMode?: boolean;
}

export interface NotificationListResponse extends PaginatedResponse<BackendNotification> {
  unread: number;
}

export interface AiChatResponse {
  reply: string;
  suggestions: string[];
  degradedMode: boolean;
  provider: 'groq' | 'fallback';
  context: {
    matchedRtu?: string;
    matchedAlarm?: string;
    matchedRoute?: string;
    counts: {
      rtus: number;
      activeAlarms: number;
      brokenRoutes: number;
      failedOtdrTests: number;
    };
  };
  requestedBy: string;
  timestamp: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>('/dashboard/stats');
  return response.data;
};

export const getTopology = async (): Promise<{
  routes: BackendFiberRoute[];
  degradedMode?: boolean;
}> => {
  const response = await apiClient.get<{ routes: BackendFiberRoute[]; degradedMode?: boolean }>(
    '/dashboard/topology'
  );
  return response.data;
};

export const getRecentOtdrTests = async (): Promise<{
  data: BackendOtdrTest[];
  degradedMode?: boolean;
}> => {
  const response = await apiClient.get<{ data: BackendOtdrTest[]; degradedMode?: boolean }>(
    '/dashboard/otdr-recent'
  );
  return response.data;
};

export const getRTUs = async (params?: {
  status?: string;
  search?: string;
}): Promise<BackendRTU[]> => {
  const response = await apiClient.get<BackendRTU[]>('/rtu', { params });
  return response.data;
};

export const getRouteAttenuationTrend = async (
  routeId: number,
  params?: { windowMinutes?: number; limit?: number }
): Promise<RouteAttenuationTrendResponse> => {
  const response = await apiClient.get<RouteAttenuationTrendResponse>(`/dashboard/attenuation-trend/${routeId}`, {
    params,
  });
  return response.data;
};

export const queryRtuEmulator = async (ipAddress: string): Promise<EmulatorQueryResponse> => {
  const response = await apiClient.post<EmulatorQueryResponse>('/rtu/emulator/query', {
    ipAddress,
  });
  return response.data;
};

export const getEmulatorThresholds = async (): Promise<EmulatorThresholdsConfig> => {
  const response = await apiClient.get<EmulatorThresholdsConfig>('/rtu/emulator/thresholds');
  return response.data;
};

export const updateEmulatorThresholds = async (
  payload: EmulatorThresholdsConfig
): Promise<EmulatorThresholdsConfig> => {
  const response = await apiClient.put<EmulatorThresholdsConfig>('/rtu/emulator/thresholds', payload);
  return response.data;
};

export const getAlarms = async (params?: {
  severity?: string;
  status?: string;
  rtuId?: number;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<BackendAlarm>> => {
  const response = await apiClient.get<PaginatedResponse<BackendAlarm>>('/alarms', { params });
  return response.data;
};

export const getNotifications = async (params?: {
  status?: 'all' | 'read' | 'unread';
  page?: number;
  pageSize?: number;
}): Promise<NotificationListResponse> => {
  const response = await apiClient.get<NotificationListResponse>('/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id: number): Promise<BackendNotification> => {
  const response = await apiClient.patch<BackendNotification>(`/notifications/${id}/read`, {});
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<{ updated: number }> => {
  const response = await apiClient.patch<{ updated: number }>('/notifications/read-all', {});
  return response.data;
};

export const acknowledgeAlarm = async (id: number): Promise<BackendAlarm> => {
  const response = await apiClient.patch<BackendAlarm>(`/alarms/${id}/acknowledge`, {});
  return response.data;
};

export const markAlarmInProgress = async (id: number): Promise<BackendAlarm> => {
  const response = await apiClient.patch<BackendAlarm>(`/alarms/${id}/in-progress`, {});
  return response.data;
};

export const closeAlarm = async (id: number): Promise<BackendAlarm> => {
  const response = await apiClient.patch<BackendAlarm>(`/alarms/${id}/close`, {});
  return response.data;
};

export const sendAiChatMessage = async (message: string): Promise<AiChatResponse> => {
  const response = await apiClient.post<AiChatResponse>('/ai/chat', { message }, { timeout: 65000 });
  return response.data;
};

export const getRTUById = async (id: number): Promise<BackendRTU> => {
  const response = await apiClient.get<BackendRTU>(`/rtu/${id}`);
  return response.data;
};

export const getRTUByIp = async (ip: string): Promise<BackendRTU> => {
  const response = await apiClient.get<BackendRTU[]>('/rtu', { params: { search: ip } });
  if (response.data && response.data.length > 0) {
    const exactMatch = response.data.find(r => r.ipAddress === ip);
    if (exactMatch) return exactMatch;
    return response.data[0];
  }
  throw new Error('RTU not found for IP');
};

export const getTelemetryBundleByIp = async (ip: string): Promise<SupervisionTelemetryBundle> => {
  const response = await apiClient.get<SupervisionTelemetryBundle>(`/emulator/bundle/${ip}`);
  return response.data;
};

export type DiagnosticTestType = 'quick' | 'full' | 'otdr' | 'temperature';

export interface DiagnosticThresholds {
  attenuationWarningDb: number;
  attenuationCriticalDb: number;
  temperatureWarningC: number;
  temperatureCriticalC: number;
}

export interface DiagnosticTestResult {
  ipAddress: string;
  rtuName: string;
  verdict: 'pass' | 'alarm';
  testedAt: string;
  fibreName?: string;
  fibreLengthKm?: number;
  measurements: Array<{
    parameter: string;
    unit: string;
    value: number;
    status: 'pass' | 'warning' | 'critical';
    threshold: number;
    thresholdLabel: string;
    alarmType?: string;
  }>;
  otdr?: {
    wavelengthNm: number;
    pulseWidth: string;
    dynamicRangeDb: number;
    mode: string;
    result: string;
  };
  alarmCreated?: {
    id: number;
    message: string;
    alarmType: string;
    severity: string;
  };
  thresholds: DiagnosticThresholds;
}

export const runDiagnosticTest = async (payload: {
  ipAddress: string;
  testType: DiagnosticTestType;
  thresholds: DiagnosticThresholds;
}): Promise<DiagnosticTestResult> => {
  const response = await apiClient.post<DiagnosticTestResult>('/emulator/run-test', payload);
  return response.data;
};

export default apiClient;
