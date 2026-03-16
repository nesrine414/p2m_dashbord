export const ROUTE_SEGMENTS = {
  rtu: 'rtu',
  monitoring: 'monitoring',
  alarms: 'alarms',
  reports: 'reports',
  aiDashboard: 'dashboard-ia',
  profile: 'profile',
  login: 'login',
  register: 'register',
} as const;

export const ROUTE_PATHS = {
  dashboard: '/',
  rtu: `/${ROUTE_SEGMENTS.rtu}`,
  monitoring: `/${ROUTE_SEGMENTS.monitoring}`,
  alarms: `/${ROUTE_SEGMENTS.alarms}`,
  reports: `/${ROUTE_SEGMENTS.reports}`,
  aiDashboard: `/${ROUTE_SEGMENTS.aiDashboard}`,
  profile: `/${ROUTE_SEGMENTS.profile}`,
  login: `/${ROUTE_SEGMENTS.login}`,
  register: `/${ROUTE_SEGMENTS.register}`,
} as const;
