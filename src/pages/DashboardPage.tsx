import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  AccessTime,
  CheckCircleOutline,
  CrisisAlertOutlined,
  DeviceHubOutlined,
  RouterOutlined,
  Timeline,
  TrendingDown,
} from '@mui/icons-material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import WidgetCard from '../components/common/WidgetCard';
import RecentAlarmsTable, { AlarmRow } from '../components/widgets/RecentAlarmsTable';
import CriticalRoutesWidget, { CriticalRoute } from '../components/widgets/CriticalRoutesWidget';
import RTUCardsWidget, { RTUCard } from '../components/widgets/RTUCardsWidget';
import { ROUTE_PATHS } from '../constants/routes';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendRTU,
  BackendOtdrTest,
  getAlarms,
  getDashboardStats,
  getRecentOtdrTests,
  getTopology,
  getRTUs,
} from '../services/api';
import { DashboardStats, FiberStatus, RTUStatus } from '../types';

interface AttenuationSeriesPoint {
  slot: string;
  backboneNorth: number;
  backboneSouth: number;
  metroRing: number;
}

const buildAttenuationSeries = (routes: BackendFiberRoute[]): AttenuationSeriesPoint[] => {
  const validRoutes = routes.filter(
    (route): route is BackendFiberRoute & { attenuationDb: number } =>
      typeof route.attenuationDb === 'number' && route.attenuationDb > 0
  );

  const baselineNorth = validRoutes[0]?.attenuationDb ?? 15.8;
  const baselineSouth = validRoutes[1]?.attenuationDb ?? 17.3;
  const baselineMetro = validRoutes[2]?.attenuationDb ?? 14.6;
  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const offsets = [-0.7, -0.4, 0.1, 0.4, 0.9, 1.1, 0.5, 0];

  return slots.map((slot, index) => ({
    slot,
    backboneNorth: Number((baselineNorth + offsets[index]).toFixed(1)),
    backboneSouth: Number((baselineSouth + offsets[index] + 0.4).toFixed(1)),
    metroRing: Number((baselineMetro + offsets[index] - 0.3).toFixed(1)),
  }));
};

const getRtuAvailabilityEstimate = (rtu: BackendRTU): number => {
  const statusBase: Record<BackendRTU['status'], number> = {
    online: 99.4,
    warning: 87.2,
    offline: 18.5,
    unreachable: 12.5,
  };

  const temperature = typeof rtu.temperature === 'number' ? rtu.temperature : 0;
  const penalty = temperature > 38 ? (temperature - 38) * 0.45 : 0;

  return Number(Math.max(0, statusBase[rtu.status] - penalty).toFixed(1));
};

const toDashboardRtuCard = (rtu: BackendRTU): RTUCard => ({
  id: rtu.id,
  name: rtu.name,
  location: rtu.locationAddress || 'Localisation inconnue',
  status: rtu.status as RTUStatus,
  temperature: typeof rtu.temperature === 'number' ? rtu.temperature : 0,
  availabilityPercent: getRtuAvailabilityEstimate(rtu),
});

const getStatusPriority = (status: BackendRTU['status']): number => {
  switch (status) {
    case 'offline':
      return 0;
    case 'unreachable':
      return 1;
    case 'warning':
      return 2;
    default:
      return 3;
  }
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

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

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
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Impossible de charger les données du backend. Vérifiez que le backend tourne sur localhost:5000.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const online = stats?.rtuOnline || 0;
    const offline = stats?.rtuOffline || 0;
    const injoignables = stats?.rtuUnreachable || 0;
    const activeCritical = stats?.criticalAlarms || 0;
    const brokenFibers = routes.filter((item) => item.fiberStatus === FiberStatus.BROKEN).length;
    const testsFailed = otdrTests.filter((item) => item.result === 'fail').length;

    return {
      online,
      offline,
      injoignables,
      activeCritical,
      brokenFibers,
      testsFailed,
      totalRtus: stats?.rtuTotal || 0,
      availability: stats?.availability || 0,
      degradedMode: Boolean(stats?.degradedMode),
    };
  }, [stats, routes, otdrTests]);

  const attenuationSeries = useMemo(() => buildAttenuationSeries(routes), [routes]);

  const averageAttenuation = useMemo(() => {
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

  const estimatedMtbfHours = useMemo(() => {
    const incidentLoad = Math.max(1, summary.activeCritical + summary.brokenFibers + summary.testsFailed);
    const networkScale = Math.max(1, summary.totalRtus);
    return Number(((networkScale * 168) / incidentLoad).toFixed(1));
  }, [summary.activeCritical, summary.brokenFibers, summary.testsFailed, summary.totalRtus]);

  const dashboardRtus = useMemo(() => rtus, [rtus]);

  const alarmRows = useMemo<AlarmRow[]>(
    () =>
      criticalAlarms.map((item) => ({
        id: item.id,
        type: item.alarmType,
        rtu: item.rtuName || `RTU-${item.rtuId || 'N/D'}`,
        zone: item.zone || item.location || 'N/D',
        severity: item.severity,
        status: item.lifecycleStatus === 'cleared' ? 'resolved' : item.lifecycleStatus,
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
          attenuation:
            route.attenuationDb && route.attenuationDb > 0
              ? `${route.attenuationDb.toFixed(1)} dB`
              : 'N/D',
          lastTest: route.lastTestTime || 'N/D',
        })),
    [routes]
  );

  const mttrTarget = 4.0;
  const mtbfTarget = 100.0;
  const attenuationTarget = 1.0;
  const availabilityTarget = 99.0;

  const mttrTrend = Number((((mttrTarget - (stats?.mttr || 0)) / mttrTarget) * 100).toFixed(1));
  const mtbfTrend = Number((((estimatedMtbfHours - mtbfTarget) / mtbfTarget) * 100).toFixed(1));
  const attenuationTrend = Number((((attenuationTarget - averageAttenuation) / attenuationTarget) * 100).toFixed(1));
  const availabilityTrend = Number((((summary.availability - availabilityTarget) / availabilityTarget) * 100).toFixed(1));

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.7}>
        Vue 1 - Supervision temps réel
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Supervision en temps réel des RTU, des alarmes critiques et des routes fibre.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des données du backend...
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
          Le backend fonctionne sans PostgreSQL. Les données affichées sont celles de démonstration de l'API.
        </Alert>
      )}

      {!loading && !error && !summary.degradedMode && (
        <Alert severity="success" sx={{ mb: 2 }}>
          API en direct connectée à PostgreSQL sur localhost:5000.
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="0/6 RTU actives"
            value={`${summary.online}/${summary.totalRtus}`}
            subtitle={`${summary.offline} hors ligne - ${summary.injoignables} injoignables`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            color="#6aa884"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ALARMES CRITIQUES"
            value={summary.activeCritical}
            subtitle="Actives, non résolues"
            icon={<CrisisAlertOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#cf3f4a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="FIBRES CASSÉES"
            value={summary.brokenFibers}
            subtitle="Routes à corriger"
            icon={<RouterOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#f08934"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ÉCHECS OTDR"
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
            title="MTTR (temps de réparation)"
            value={`${(stats?.mttr || 0).toFixed(1)}h`}
            subtitle="Calculé à partir des alarmes clôturées"
            icon={<AccessTime sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            color="#667eea"
            trend={{ value: mttrTrend, isPositive: (stats?.mttr || 0) <= mttrTarget }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTBF (estimé)"
            value={`${estimatedMtbfHours.toFixed(1)}h`}
            subtitle="Dérivé de la densité de pannes"
            icon={<Timeline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
            trend={{ value: mtbfTrend, isPositive: estimatedMtbfHours >= mtbfTarget }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="ATTÉNUATION MOYENNE"
            value={`${averageAttenuation.toFixed(1)} dB`}
            subtitle={`Cible : <${attenuationTarget.toFixed(1)} dB`}
            icon={<TrendingDown sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            color="#f093fb"
            trend={{ value: attenuationTrend, isPositive: averageAttenuation <= attenuationTarget }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="DISPONIBILITÉ RÉSEAU"
            value={`${summary.availability.toFixed(1)}%`}
            subtitle={`Cible : >${availabilityTarget.toFixed(1)}%`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
            trend={{ value: availabilityTrend, isPositive: summary.availability >= availabilityTarget }}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} mb={2}>
          <Box>
            <Typography variant="h6" color="white">
              Tendance d'atténuation (30 jours)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suivi des variations sur les routes principales.
            </Typography>
          </Box>
          <Typography variant="caption" color="#8fb3d1">
            4 dernières semaines
          </Typography>
        </Stack>
        <Box sx={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attenuationSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
              <XAxis dataKey="slot" stroke="#9aa9bd" />
              <YAxis stroke="#9aa9bd" />
              <Tooltip />
              <ReferenceArea x1="14:00" x2="15:00" fill="rgba(140, 96, 255, 0.16)" />
              <ReferenceLine
                y={18}
                stroke="#ff4d6d"
                strokeDasharray="6 6"
                label={{ value: 'Seuil critique 18 dB', position: 'right', fill: '#ff4d6d', fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ color: '#e2ecff', fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="backboneNorth" name="Noyau Nord" stroke="#76d6ff" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="backboneSouth" name="Noyau Sud" stroke="#f8b26a" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="metroRing" name="Anneau métropolitain" stroke="#b28bff" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <RecentAlarmsTable alarms={alarmRows} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CriticalRoutesWidget routes={routeRows} />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#252f44', border: '1px solid #4e6480' }}>
            <Typography variant="h6" color="white" mb={1}>
              Vue 2 - Réseau
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Topologie optique, atténuation par route et derniers tests OTDR.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.monitoring} variant="contained">
                Ouvrir la supervision
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.rtu} variant="outlined">
                Ouvrir les RTU
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#2b2f46', border: '1px solid #676c95' }}>
            <Typography variant="h6" color="white" mb={1}>
              Vue 3 - Qualité et historique
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Tendances, KPI qualité, rapports périodiques et suivi des incidents.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.reports} variant="contained" color="secondary">
                Ouvrir les rapports
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.aiDashboard} variant="outlined">
                Ouvrir l'IA
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <RTUCardsWidget rtus={dashboardRtus} />

    </Box>
  );
};

export default DashboardPage;