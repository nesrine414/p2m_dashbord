import axios from 'axios';
import { DashboardStats } from '../types';
import { getStoredToken } from './auth';

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

export interface BackendAlarm {
  id: number;
  rtuId?: number | null;
  rtuName?: string;
  zone?: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  lifecycleStatus: 'active' | 'acknowledged' | 'cleared';
  alarmType: 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'Temperature' | 'Maintenance';
  message: string;
  location?: string | null;
  localizationKm?: string | null;
  owner?: string | null;
  occurredAt: string;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  degradedMode?: boolean;
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

export const sendAiChatMessage = async (message: string): Promise<AiChatResponse> => {
  const response = await apiClient.post<AiChatResponse>('/ai/chat', { message }, { timeout: 65000 });
  return response.data;
};

export default apiClient;
