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
import RTUCardsWidget from '../components/widgets/RTUCardsWidget';
import { attenuationSeries } from '../data/mockData';
import { ROUTE_PATHS } from '../constants/routes';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  getAlarms,
  getDashboardStats,
  getRecentOtdrTests,
  getTopology,
} from '../services/api';
import { DashboardStats, FiberStatus } from '../types';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [criticalAlarms, setCriticalAlarms] = useState<BackendAlarm[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [otdrTests, setOtdrTests] = useState<BackendOtdrTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, alarmsData, topologyData, otdrData] = await Promise.all([
          getDashboardStats(),
          getAlarms({ severity: 'critical', page: 1, pageSize: 50 }),
          getTopology(),
          getRecentOtdrTests(),
        ]);

        if (!active) {
          return;
        }

        setStats(statsData);
        setCriticalAlarms(alarmsData.data);
        setRoutes(topologyData.routes);
        setOtdrTests(otdrData.data);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Unable to load backend data. Check that backend is running on localhost:5000.');
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
    const unreachable = stats?.rtuUnreachable || 0;
    const activeCritical = stats?.criticalAlarms || 0;
    const brokenFibers = routes.filter((item) => item.fiberStatus === FiberStatus.BROKEN).length;
    const testsFailed = otdrTests.filter((item) => item.result === 'fail').length;

    return {
      online,
      offline,
      unreachable,
      activeCritical,
      brokenFibers,
      testsFailed,
      totalRtus: stats?.rtuTotal || 0,
      degradedMode: Boolean(stats?.degradedMode),
    };
  }, [stats, routes, otdrTests]);

  const alarmRows = useMemo<AlarmRow[]>(
    () =>
      criticalAlarms.map((item) => ({
        id: item.id,
        type: item.alarmType,
        rtu: item.rtuName || `RTU-${item.rtuId || 'N/A'}`,
        zone: item.zone || item.location || 'N/A',
        severity: item.severity,
        status: item.lifecycleStatus === 'cleared' ? 'resolved' : item.lifecycleStatus,
        timestamp: item.occurredAt,
        location: item.localizationKm || item.location || 'N/A',
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
              : 'N/A',
          lastTest: route.lastTestTime || 'N/A',
        })),
    [routes]
  );

  const kpiMTTR = {
    value: 2.4,
    unit: 'h',
    trend: -12.5,
    target: 4.0,
  };

  const kpiMTBF = {
    value: 120,
    unit: 'h',
    trend: 8.3,
    target: 100,
  };

  const kpiLossRate = {
    value: 5.2,
    unit: '%',
    trend: 2.1,
    target: 5.0,
  };

  const kpiAvailability = {
    value: 99.2,
    unit: '%',
    trend: 0.5,
    target: 99.0,
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.7}>
        View 1 - NOC Real-Time
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Real-time monitoring of RTUs, critical alarms, and fiber routes.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading backend data...
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
          Backend is running without PostgreSQL. You are seeing API demo data.
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="RTU ONLINE"
            value={`${summary.online}/${summary.totalRtus}`}
            subtitle={`${summary.offline} offline - ${summary.unreachable} unreachable`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            color="#6aa884"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="CRITICAL ALARMS"
            value={summary.activeCritical}
            subtitle="Active, unresolved"
            icon={<CrisisAlertOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#cf3f4a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="BROKEN FIBERS"
            value={summary.brokenFibers}
            subtitle="Routes to fix"
            icon={<RouterOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#f08934"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="OTDR FAILURES"
            value={summary.testsFailed}
            subtitle="Latest tests"
            icon={<DeviceHubOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#3c7fff"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTTR (Repair Time)"
            value={`${kpiMTTR.value}${kpiMTTR.unit}`}
            subtitle={`Target: <${kpiMTTR.target}h`}
            icon={<AccessTime sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            color="#667eea"
            trend={{ value: kpiMTTR.trend, isPositive: kpiMTTR.trend < 0 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="MTBF (Between Failures)"
            value={`${kpiMTBF.value}${kpiMTBF.unit}`}
            subtitle={`Target: >${kpiMTBF.target}h`}
            icon={<Timeline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
            trend={{ value: kpiMTBF.trend, isPositive: kpiMTBF.trend >= 0 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="LOSS RATE (Optical Loss)"
            value={`${kpiLossRate.value}${kpiLossRate.unit}`}
            subtitle={`Target: <${kpiLossRate.target}%`}
            icon={<TrendingDown sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            color="#f093fb"
            trend={{ value: kpiLossRate.trend, isPositive: kpiLossRate.trend < 0 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="NETWORK AVAILABILITY"
            value={`${kpiAvailability.value}${kpiAvailability.unit}`}
            subtitle={`Target: >${kpiAvailability.target}%`}
            icon={<CheckCircleOutline sx={{ color: 'white', fontSize: 30 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            color="#11998e"
            trend={{ value: kpiAvailability.trend, isPositive: kpiAvailability.trend >= 0 }}
          />
        </Grid>
      </Grid>

      <Box className="glass-card" sx={{ p: 2.8, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Performance indicators (KPIs)
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#667eea" gutterBottom>
                MTTR - Mean Time To Repair
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Average time to repair a failure. Target: &lt;4h
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mt: 1, display: 'block' }}>
                Formula: total resolution time / resolved alarms count
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#11998e" gutterBottom>
                MTBF - Mean Time Between Failures
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Average time between failures. Target: &gt;100h
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mt: 1, display: 'block' }}>
                Formula: total time / number of failures
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#f093fb" gutterBottom>
                LOSS RATE - Optical loss rate
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Average optical loss percentage. Target: &lt;5%
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mt: 1, display: 'block' }}>
                Formula: (measured attenuation - baseline) / baseline * 100
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#11998e" gutterBottom>
                AVAILABILITY - Network availability
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Percentage of time the network is operational. Target: &gt;99%
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mt: 1, display: 'block' }}>
                Formula: (uptime / total time) * 100
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} mb={2}>
          <Box>
            <Typography variant="h6" color="white">
              Attenuation Trend (30 days)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Variation tracking on primary routes.
            </Typography>
          </Box>
          <Typography variant="caption" color="#8fb3d1">
            Last 4 weeks
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
                label={{ value: 'Critical threshold 18 dB', position: 'right', fill: '#ff4d6d', fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ color: '#e2ecff', fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="backboneNorth" name="Backbone North" stroke="#76d6ff" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="backboneSouth" name="Backbone South" stroke="#f8b26a" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="metroRing" name="Metro Ring" stroke="#b28bff" strokeWidth={2.5} dot={false} />
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
              View 2 - Network
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Optical topology, per-route attenuation, and latest OTDR tests.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.monitoring} variant="contained">
                Open Monitoring
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.rtu} variant="outlined">
                Open RTU
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#2b2f46', border: '1px solid #676c95' }}>
            <Typography variant="h6" color="white" mb={1}>
              View 3 - Quality & History
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Trends, quality KPIs, periodic reports, and incident tracking.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.reports} variant="contained" color="secondary">
                Open Reports
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.aiDashboard} variant="outlined">
                Open AI
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <RTUCardsWidget />

    </Box>
  );
};

export default DashboardPage;
