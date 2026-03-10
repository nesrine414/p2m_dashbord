import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { CheckCircleOutline, CrisisAlertOutlined, DeviceHubOutlined, RouterOutlined } from '@mui/icons-material';
import WidgetCard from '../components/common/WidgetCard';
import StatusBadge from '../components/common/StatusBadge';
import { nqmsMatrixRows } from '../data/mockData';
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

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return 'N/A';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

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

  const criticalRows = nqmsMatrixRows.filter((row) => row.criticality === 'Critique').slice(0, 8);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.7}>
        Vue 1 - NOC Temps Reel
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Supervision immediate des RTU, alarmes critiques et routes fibre.
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
            title="ALARMES CRITIQUES"
            value={summary.activeCritical}
            subtitle="Actives non resolues"
            icon={<CrisisAlertOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#cf3f4a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="FIBRES BROKEN"
            value={summary.brokenFibers}
            subtitle="Routes a corriger"
            icon={<RouterOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#f08934"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <WidgetCard
            title="OTDR FAIL"
            value={summary.testsFailed}
            subtitle="Derniers tests"
            icon={<DeviceHubOutlined sx={{ color: 'white', fontSize: 30 }} />}
            color="#3c7fff"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              Alarmes critiques en cours
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>RTU</TableCell>
                    <TableCell>Zone</TableCell>
                    <TableCell>Severite</TableCell>
                    <TableCell>Etat</TableCell>
                    <TableCell>Localisation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {criticalAlarms.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.alarmType}</TableCell>
                      <TableCell>{item.rtuName || `RTU-${item.rtuId || 'N/A'}`}</TableCell>
                      <TableCell>{item.zone || item.location || 'N/A'}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.lifecycleStatus} />
                      </TableCell>
                      <TableCell>{item.localizationKm || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              Routes fibres critiques
            </Typography>
            <Stack spacing={1.3}>
              {routes
                .filter((route) => route.fiberStatus !== FiberStatus.NORMAL)
                .map((route) => (
                  <Box key={route.id} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#2a3349' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="white" fontWeight={700}>
                        {route.routeName}
                      </Typography>
                      <StatusBadge status={route.fiberStatus} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {route.source} to {route.destination}
                    </Typography>
                    <Typography variant="caption" color="#8fb3d1" display="block">
                      Attenuation{' '}
                      {route.attenuationDb && route.attenuationDb > 0
                        ? `${route.attenuationDb.toFixed(1)} dB`
                        : 'N/A'}{' '}
                      | Last test {formatDateTime(route.lastTestTime)}
                    </Typography>
                  </Box>
                ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#252f44', border: '1px solid #4e6480' }}>
            <Typography variant="h6" color="white" mb={1}>
              Vue 2 - Reseau
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Topologie optique, attenuation par route et derniers tests OTDR.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.monitoring} variant="contained">
                Ouvrir Monitoring
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.rtu} variant="outlined">
                Ouvrir RTU
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#2b2f46', border: '1px solid #676c95' }}>
            <Typography variant="h6" color="white" mb={1}>
              Vue 3 - Qualite & Historique
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Tendances, KPI de qualite, rapports periodiques et suivi des incidents.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={ROUTE_PATHS.reports} variant="contained" color="secondary">
                Ouvrir Rapports
              </Button>
              <Button component={RouterLink} to={ROUTE_PATHS.aiDashboard} variant="outlined">
                Ouvrir IA
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
        <Typography variant="h6" color="white" mb={2}>
          Matrice NQMS - Parametres critiques
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domaine</TableCell>
                <TableCell>Parametre</TableCell>
                <TableCell>Valeurs</TableCell>
                <TableCell>Widget</TableCell>
                <TableCell>Criticite</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criticalRows.map((row) => (
                <TableRow key={`${row.domain}-${row.parameter}`} hover>
                  <TableCell>{row.domain}</TableCell>
                  <TableCell>{row.parameter}</TableCell>
                  <TableCell>{row.values}</TableCell>
                  <TableCell>{row.widgetType}</TableCell>
                  <TableCell>{row.criticality}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default DashboardPage;
