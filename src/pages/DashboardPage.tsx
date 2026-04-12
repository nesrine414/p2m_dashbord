import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import {
  AccessTime,
  CheckCircleOutline,
  CrisisAlertOutlined,
  DeviceHubOutlined,
  InsightsOutlined,
  RouterOutlined,
  Timeline,
  TrendingDown,
} from '@mui/icons-material';
import WidgetCard from '../components/common/WidgetCard';
import RecentAlarmsTable, { AlarmRow } from '../components/widgets/RecentAlarmsTable';
import CriticalRoutesWidget, { CriticalRoute } from '../components/widgets/CriticalRoutesWidget';
import RTUCardsWidget, { RTUCard } from '../components/widgets/RTUCardsWidget';
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
    case RTUStatus.OFFLINE:
      return 0;
    case RTUStatus.UNREACHABLE:
      return 1;
    default:
      return 2;
  }
};

const toAlarmRowStatus = (status: BackendAlarm['lifecycleStatus']): AlarmRow['status'] => {
  if (status === 'closed' || status === 'cleared' || status === 'resolved') {
    return 'resolved';
  }

  if (status === 'in_progress') {
    return 'in_progress';
  }

  if (status === 'acknowledged') {
    return 'acknowledged';
  }

  return 'active';
};

const formatMttrValue = (hours: number | null): string => {
  if (hours === null || !Number.isFinite(hours) || hours < 0) {
    return 'N/D';
  }

  if (hours === 0) {
    return '0.0 min';
  }

  if (hours < 1) {
    return `${(hours * 60).toFixed(1)} min`;
  }

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

  const agingFibresCount =
    source.agingFibresCount === undefined
      ? undefined
      : isFiniteNumber(source.agingFibresCount)
        ? Number(source.agingFibresCount)
        : undefined;

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
    agingFibresCount,
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
        if (showLoader) {
          setLoading(true);
          setError(null);
        }

        const [statsData, alarmsData, topologyData, otdrData, rtuData] = await Promise.all([
          getDashboardStats(),
          getAlarms({ severity: 'critical', page: 1, pageSize: 50 }),
          getTopology(),
          getRecentOtdrTests(),
          getRTUs(),
        ]);

        if (!active) {
          return;
        }

        setStats(statsData);
        setCriticalAlarms(alarmsData.data);
        setRoutes(topologyData.routes);
        setOtdrTests(otdrData.data);

        const dashboardCards = rtuData
          .slice()
          .sort(
            (left, right) =>
              getStatusPriority(left.status) - getStatusPriority(right.status) ||
              (typeof right.temperature === 'number' ? right.temperature : 0) -
                (typeof left.temperature === 'number' ? left.temperature : 0)
          )
          .slice(0, 6)
          .map(toDashboardRtuCard);

        setRtus(dashboardCards);
      } catch {
        if (!active) {
          return;
        }
        if (showLoader) {
          setError('Impossible de charger les donnees du backend. Verifiez que le backend tourne sur localhost:5000.');
        }
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    };

    void loadDashboardData(true);

    const socket = getSocket();
    const onRealtimeUpdate = () => {
      void loadDashboardData(false);
    };
    const onKpiUpdate = (payload: unknown) => {
      if (!active) {
        return;
      }

      const nextStats = toDashboardStatsPayload(payload);
      if (!nextStats) {
        return;
      }

      setStats(nextStats);
    };

    socket.on('emulator_cycle_completed', onRealtimeUpdate);
    socket.on('new_alarm', onRealtimeUpdate);
    socket.on('alarm_updated', onRealtimeUpdate);
    socket.on('kpi_updated', onKpiUpdate);

    const refreshInterval = window.setInterval(() => {
      void loadDashboardData(false);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      socket.off('emulator_cycle_completed', onRealtimeUpdate);
      socket.off('new_alarm', onRealtimeUpdate);
      socket.off('alarm_updated', onRealtimeUpdate);
      socket.off('kpi_updated', onKpiUpdate);
    };
  }, []);

  const summary = useMemo(() => {
    const online = stats?.rtuOnline || 0;
    const offline = stats?.rtuOffline || 0;
    const injoignables = stats?.rtuUnreachable || 0;
    const activeCritical = stats?.criticalAlarms || 0;
    const brokenFibers = routes.filter((item) => item.fiberStatus === FiberStatus.BROKEN).length;
    const testsFailed = otdrTests.filter((item) => item.result === 'fail').length;
    const computedAgingFibres = routes.filter(
      (route) => route.agingStatus === 'aging' || route.agingStatus === 'critical'
    ).length;
    const agingFibres =
      typeof stats?.agingFibresCount === 'number' ? stats.agingFibresCount : computedAgingFibres;

    return {
      online,
      offline,
      injoignables,
      activeCritical,
      brokenFibers,
      testsFailed,
      agingFibres,
      totalRtus: stats?.rtuTotal || 0,
      availability: stats?.availability || 0,
      degradedMode: Boolean(stats?.degradedMode),
    };
  }, [stats, routes, otdrTests]);

  const computedAverageAttenuation = useMemo(() => {
    const validRoutes = routes.filter(
      (route) => typeof route.attenuationDb === 'number' && Number(route.attenuationDb) > 0
    );

    if (validRoutes.length === 0) {
      return 0;
    }

    const average =
      validRoutes.reduce((total, route) => total + Number(route.attenuationDb || 0), 0) / validRoutes.length;
    return Number(average.toFixed(1));
  }, [routes]);

  const computedMtbfHours = useMemo(() => {
    const incidentLoad = Math.max(1, summary.activeCritical + summary.brokenFibers + summary.testsFailed);
    const networkScale = Math.max(1, summary.totalRtus);
    return Number(((networkScale * 168) / incidentLoad).toFixed(1));
  }, [summary.activeCritical, summary.brokenFibers, summary.testsFailed, summary.totalRtus]);

  const liveAverageAttenuation = useMemo(() => {
    if (typeof stats?.averageAttenuation === 'number') {
      return stats.averageAttenuation;
    }
    return computedAverageAttenuation;
  }, [stats?.averageAttenuation, computedAverageAttenuation]);

  const liveMtbfHours = useMemo(() => {
    if (typeof stats?.mtbf === 'number') {
      return stats.mtbf;
    }
    return computedMtbfHours;
  }, [stats?.mtbf, computedMtbfHours]);

  const dashboardRtus = useMemo(() => rtus, [rtus]);

  const alarmRows = useMemo<AlarmRow[]>(
    () =>
      criticalAlarms.map((item) => ({
        id: item.id,
        type: item.alarmType,
        rtu: item.rtuName || `RTU-${item.rtuId || 'N/D'}`,
        zone: item.zone || item.location || 'N/D',
        severity: item.severity,
        status: toAlarmRowStatus(item.lifecycleStatus),
        timestamp: item.occurredAt,
        location: item.localizationKm || item.location || 'N/D',
      })),
    [criticalAlarms]
  );

  const routeRows = useMemo<CriticalRoute[]>(
    () =>
      routes
        .filter((route) => route.fiberStatus !== FiberStatus.NORMAL)
        .map((route) => ({
          id: route.id,
          name: route.routeName,
          from: route.source,
          to: route.destination,
          status: route.fiberStatus === FiberStatus.BROKEN ? 'broken' : 'degraded',
          attenuation: route.attenuationDb && route.attenuationDb > 0 ? `${route.attenuationDb.toFixed(1)} dB` : 'N/D',
          lastTest: route.lastTestTime || 'N/D',
        })),
    [routes]
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.7}>
        Vue 1 - Supervision temps reel
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} sx={{ opacity: 0.8 }}>
        Centre d'Opérations Réseau (NOC) - Suivi en temps réel des infrastructures critiques.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des donnees du backend...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {summary.degradedMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Le backend fonctionne sans PostgreSQL. Donnees de demonstration actives.
        </Alert>
      )}

      {!loading && !error && !summary.degradedMode && (
        <Alert severity="success" sx={{ mb: 2 }}>
          API en direct connectee a PostgreSQL sur localhost:5000.
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="RTU EN LIGNE"
            value={`${summary.online}/${summary.totalRtus}`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            color="#6aa884"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ALARMES CRITIQUES"
            value={summary.activeCritical}
            subtitle="Actives, non resolues"
            icon={<CrisisAlertOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#cf3f4a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="FIBRES COUPEES"
            value={summary.brokenFibers}
            subtitle="Routes a corriger"
            icon={<RouterOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#f08934"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ECHECS OTDR"
            value={summary.testsFailed}
            subtitle="Derniers tests"
            icon={<DeviceHubOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#3c7fff"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="FIBRES VIEILLISSANTES"
            value={summary.agingFibres}
            subtitle="Ratio attenuation/km eleve"
            icon={<InsightsOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#c38a2f"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTTR (temps de reparation)"
            value={formatMttrValue(stats?.mttr || 0)}
            icon={<AccessTime sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            color="#667eea"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTBF (estime)"
            value={`${liveMtbfHours.toFixed(1)}h`}
            icon={<Timeline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ATTENUATION MOYENNE"
            value={`${liveAverageAttenuation.toFixed(1)} dB`}
            icon={<TrendingDown sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            color="#f093fb"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="DISPONIBILITE RESEAU"
            value={`${summary.availability.toFixed(1)}%`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <RecentAlarmsTable alarms={alarmRows} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CriticalRoutesWidget routes={routeRows} />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12 }}>
          <HardwareAlertsWidget rtus={dashboardRtus} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
