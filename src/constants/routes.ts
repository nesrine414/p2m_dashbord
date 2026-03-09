export const ROUTE_SEGMENTS = {
  rtu: 'rtu',
  monitoring: 'monitoring',
  alarms: 'alarms',
  reports: 'reports',
  aiDashboard: 'dashboard-ia',
} as const;

export const ROUTE_PATHS = {
  dashboard: '/',
  rtu: `/${ROUTE_SEGMENTS.rtu}`,
  monitoring: `/${ROUTE_SEGMENTS.monitoring}`,
  alarms: `/${ROUTE_SEGMENTS.alarms}`,
  reports: `/${ROUTE_SEGMENTS.reports}`,
  aiDashboard: `/${ROUTE_SEGMENTS.aiDashboard}`,
} as const;
