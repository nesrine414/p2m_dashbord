import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Grid, Typography, Breadcrumbs, Link } from '@mui/material';
import {
  AccessTime,
  CheckCircleOutline,
  CrisisAlertOutlined,
  DeviceHubOutlined,
  InsightsOutlined,
  RouterOutlined,
  Timeline,
  TrendingDown,
  Home,
} from '@mui/icons-material';
import { WidgetCard } from '../components/common';
import RecentAlarmsTable, { AlarmRow } from '../components/widgets/RecentAlarmsTable';
import CriticalRoutesWidget from '../components/widgets/CriticalRoutesWidget';
import { RTUCard } from '../components/widgets/RTUCardsWidget';
import RTUCardsWidget from '../components/widgets/RTUCardsWidget';
import HardwareAlertsWidget from '../components/widgets/HardwareAlertsWidget';
import { normalizeRtuStatus } from '../utils/rtuStatus';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
  getAlarms,
  getDashboardStats,
  getRecentOtdrTests,
  getTopology,
  getRTUs,
} from '../services/api';
import { DashboardStats, FiberStatus, RTUStatus } from '../types';
import getSocket from '../utils/socket';

const getRtuAvailabilityEstimate = (rtu: BackendRTU): number => {
  const status = normalizeRtuStatus(rtu.status);
  const temperature = typeof rtu.temperature === 'number' ? rtu.temperature : 0;
  const penalty = temperature > 38 ? (temperature - 38) * 0.45 : 0;
  const base = status === RTUStatus.ONLINE ? 99.4 : status === RTUStatus.OFFLINE ? 18.5 : 12.5;
  return Number(Math.max(0, base - penalty).toFixed(1));
};

const toDashboardRtuCard = (rtu: BackendRTU): RTUCard => ({
  id: rtu.id,
  name: rtu.name,
  location: rtu.locationAddress || 'Localisation inconnue',
  status: normalizeRtuStatus(rtu.status),
  temperature: typeof rtu.temperature === 'number' ? rtu.temperature : 0,
  availabilityPercent: getRtuAvailabilityEstimate(rtu),
});

const getStatusPriority = (status: BackendRTU['status']): number => {
  switch (normalizeRtuStatus(status)) {
    case RTUStatus.OFFLINE: return 0;
    case RTUStatus.UNREACHABLE: return 1;
    default: return 2;
  }
};

const toAlarmRowStatus = (status: BackendAlarm['lifecycleStatus']): AlarmRow['status'] => {
  if (status === 'closed' || status === 'cleared' || status === 'resolved') return 'resolved';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'acknowledged') return 'acknowledged';
  return 'active';
};

const formatMttrValue = (hours: number | null): string => {
  if (hours === null || !Number.isFinite(hours) || hours < 0) return 'N/D';
  if (hours === 0) return '0.0 min';
  if (hours < 1) return `${(hours * 60).toFixed(1)} min`;
  return `${hours.toFixed(2)}h`;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toDashboardStatsPayload = (payload: unknown): DashboardStats | null => {
  const source = payload as Record<string, unknown>;
  if (
    !isFiniteNumber(source.rtuOnline) ||
    !isFiniteNumber(source.rtuOffline) ||
    !isFiniteNumber(source.rtuWarning) ||
    !isFiniteNumber(source.rtuUnreachable) ||
    !isFiniteNumber(source.rtuTotal) ||
    !isFiniteNumber(source.criticalAlarms) ||
    !isFiniteNumber(source.majorAlarms) ||
    !isFiniteNumber(source.minorAlarms) ||
    (!isFiniteNumber(source.mttr) && source.mttr !== null) ||
    !isFiniteNumber(source.mtbf) ||
    !isFiniteNumber(source.averageAttenuation) ||
    !isFiniteNumber(source.availability)
  ) {
    return null;
  }
  return {
    rtuOnline: Number(source.rtuOnline),
    rtuOffline: Number(source.rtuOffline),
    rtuWarning: Number(source.rtuWarning),
    rtuUnreachable: Number(source.rtuUnreachable),
    rtuTotal: Number(source.rtuTotal),
    criticalAlarms: Number(source.criticalAlarms),
    majorAlarms: Number(source.majorAlarms),
    minorAlarms: Number(source.minorAlarms),
    mttr: source.mttr === null ? null : Number(source.mttr),
    mtbf: Number(source.mtbf),
    averageAttenuation: Number(source.averageAttenuation),
    availability: Number(source.availability),
    agingFibresCount: typeof source.agingFibresCount === 'number' ? source.agingFibresCount : undefined,
    degradedMode: typeof source.degradedMode === 'boolean' ? source.degradedMode : undefined,
  };
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [criticalAlarms, setCriticalAlarms] = useState<BackendAlarm[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [otdrTests, setOtdrTests] = useState<BackendOtdrTest[]>([]);
  const [rtus, setRtus] = useState<RTUCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadDashboardData = async (showLoader = false) => {
      try {
        if (showLoader) { setLoading(true); setError(null); }
        const [statsData, alarmsData, topologyData, otdrData, rtuData] = await Promise.all([
          getDashboardStats(),
          getAlarms({ severity: 'critical', page: 1, pageSize: 50 }),
          getTopology(),
          getRecentOtdrTests(),
          getRTUs(),
        ]);
        if (!active) return;
        setStats(statsData);
        setCriticalAlarms(alarmsData.data);
        setRoutes(topologyData.routes);
        setOtdrTests(otdrData.data);
        const dashboardCards = rtuData
          .slice()
          .sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status) || (right.temperature || 0) - (left.temperature || 0))
          .slice(0, 6)
          .map(toDashboardRtuCard);
        setRtus(dashboardCards);
      } catch {
        if (!active) return;
        if (showLoader) setError('Connexion perdue avec le serveur NOC.');
      } finally {
        if (active && showLoader) setLoading(false);
      }
    };

    void loadDashboardData(true);
    const socket = getSocket();
    const onRealtimeUpdate = () => void loadDashboardData(false);
    socket.on('emulator_cycle_completed', onRealtimeUpdate);
    socket.on('new_alarm', onRealtimeUpdate);
    socket.on('kpi_updated', (payload) => {
         const next = toDashboardStatsPayload(payload);
         if (next) setStats(next);
    });

    const refreshInterval = window.setInterval(() => loadDashboardData(false), 30000);
    return () => { active = false; window.clearInterval(refreshInterval); socket.off('new_alarm', onRealtimeUpdate); };
  }, []);

  const summary = useMemo(() => {
    const brokenFibers = routes.filter((item) => item.fiberStatus === FiberStatus.BROKEN).length;
    const testsFailed = otdrTests.filter((item) => item.result === 'fail').length;
    return {
      online: stats?.rtuOnline || 0,
      offline: stats?.rtuOffline || 0,
      activeCritical: stats?.criticalAlarms || 0,
      brokenFibers,
      testsFailed,
      totalRtus: stats?.rtuTotal || 0,
      availability: stats?.availability || 0,
      degradedMode: Boolean(stats?.degradedMode),
      agingFibres: stats?.agingFibresCount || routes.filter(r => r.agingStatus === 'aging').length
    };
  }, [stats, routes, otdrTests]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5}>Tableau de bord</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Typography color="text.primary">Supervision</Typography>
            </Breadcrumbs>
        </Box>
        {loading && <CircularProgress size={20} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {summary.degradedMode && <Alert severity="warning" sx={{ mb: 2 }}>Mode démonstration actif - Absence de base de données PostgreSQL.</Alert>}

      {/* Primary Supervision Section */}
      <Typography variant="subtitle1" fontWeight={800} color="text.secondary" mb={2} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        1. Supervision Temps Réel
      </Typography>
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="RTU CONNECTÉS"
            value={`${summary.online}/${summary.totalRtus}`}
            icon={<CheckCircleOutline />}
            gradient="linear-gradient(135deg, #17a2b8 0%, #117a8b 100%)"
            color="#17a2b8"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ALARMES CRITIQUES"
            value={summary.activeCritical}
            icon={<CrisisAlertOutlined />}
            gradient="linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)"
            color="#dc3545"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="FIBRES COUPÉES"
            value={summary.brokenFibers}
            icon={<RouterOutlined />}
            gradient="linear-gradient(135deg, #ffc107 0%, #d39e00 100%)"
            color="#ffc107"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="PERFORMANCE RÉSEAU"
            value={`${summary.availability.toFixed(1)}%`}
            icon={<DeviceHubOutlined />}
            gradient="linear-gradient(135deg, #28a745 0%, #1e7e34 100%)"
            color="#28a745"
          />
        </Grid>
      </Grid>

      {/* KPI Section */}
      <Typography variant="subtitle1" fontWeight={800} color="text.secondary" mb={2} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        2. Métriques de Performance (KPI)
      </Typography>
      <Grid container spacing={2} mb={5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTTR Moyen"
            value={formatMttrValue(stats?.mttr || 0)}
            subtitle="Temps de rétablissement"
            icon={<AccessTime />}
            color="#007bff"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTBF Estimé"
            value={`${(stats?.mtbf || 0).toFixed(1)}h`}
            subtitle="Temps moyen entre pannes"
            icon={<Timeline />}
            color="#6f42c1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="Atténuation"
            value={`${(stats?.averageAttenuation || 0).toFixed(1)} dB`}
            subtitle="Moyenne globale"
            icon={<TrendingDown />}
            color="#e83e8c"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="Risques PFE"
            value={summary.agingFibres}
            subtitle="Fibres vieillissantes"
            icon={<InsightsOutlined />}
            color="#fd7e14"
          />
        </Grid>
      </Grid>

      {/* RTU Hardware Section - Restored full view */}
      <Box mb={5}>
        <RTUCardsWidget rtus={rtus} />
      </Box>

      {/* Alerts & Critical Routes */}
      <Typography variant="subtitle1" fontWeight={800} color="text.secondary" mb={2} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        3. Alertes Récentes & Topologie
      </Typography>
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <RecentAlarmsTable alarms={criticalAlarms.map(item => ({
             id: item.id, type: item.alarmType, rtu: item.rtuName || 'RTU', zone: item.zone || 'N/D', 
             severity: item.severity, status: toAlarmRowStatus(item.lifecycleStatus), 
             timestamp: item.occurredAt, location: item.localizationKm || 'N/D'
          }))} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <CriticalRoutesWidget routes={routes.filter(r => r.fiberStatus !== FiberStatus.NORMAL).map(r => ({
              id: r.id, name: r.routeName, from: r.source, to: r.destination, 
              status: r.fiberStatus === FiberStatus.BROKEN ? 'broken' : 'degraded',
              attenuation: `${(r.attenuationDb || 0).toFixed(1)} dB`, lastTest: 'Récemment'
          }))} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
