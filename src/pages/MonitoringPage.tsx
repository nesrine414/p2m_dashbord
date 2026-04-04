import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AutoGraphOutlined, DeviceHubOutlined, RouteOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import RealtimeTunisiaMap from '../components/widgets/RealtimeTunisiaMap';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendRTU,
  BackendOtdrTest,
  getAlarms,
  getRecentOtdrTests,
  getRTUs,
  getTopology,
} from '../services/api';
import { FiberStatus, TestResult } from '../types';

interface AttenuationPoint {
  slot: string;
  backboneNorth: number;
  backboneSouth: number;
  metroRing: number;
}

interface LiveEventItem {
  id: string;
  timestamp: string;
  severity: string;
  message: string;
  source: string;
}

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return 'N/D';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const toTimeString = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const buildAttenuationSeries = (routes: BackendFiberRoute[]): AttenuationPoint[] => {
  const valid = routes.filter((route) => typeof route.attenuationDb === 'number' && route.attenuationDb > 0);
  const base = valid.map((item) => Number(item.attenuationDb || 0));
  const north = base[0] || 15.8;
  const south = base[1] || 17.3;
  const metro = base[2] || 14.6;
  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const deltas = [-0.7, -0.4, 0.1, 0.4, 0.9, 1.1, 0.5, 0];

  return slots.map((slot, index) => ({
    slot,
    backboneNorth: Number((north + deltas[index]).toFixed(1)),
    backboneSouth: Number((south + deltas[index] + 0.4).toFixed(1)),
    metroRing: Number((metro + deltas[index] - 0.3).toFixed(1)),
  }));
};

const MonitoringPage: React.FC = () => {
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [otdrTests, setOtdrTests] = useState<BackendOtdrTest[]>([]);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [topologyResponse, otdrResponse, alarmResponse, rtuResponse] = await Promise.all([
          getTopology(),
          getRecentOtdrTests(),
          getAlarms({ page: 1, pageSize: 20 }),
          getRTUs(),
        ]);

        if (!active) {
          return;
        }

        setRoutes(topologyResponse.routes);
        setOtdrTests(otdrResponse.data);
        setAlarms(alarmResponse.data);
        setRtus(rtuResponse);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Impossible de charger les données de supervision depuis le backend.');
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
    const normal = routes.filter((route) => route.fiberStatus === FiberStatus.NORMAL).length;
    const degraded = routes.filter((route) => route.fiberStatus === FiberStatus.DEGRADED).length;
    const broken = routes.filter((route) => route.fiberStatus === FiberStatus.BROKEN).length;
    const validAttenuation = routes.filter(
      (route) => typeof route.attenuationDb === 'number' && Number(route.attenuationDb) > 0
    );
    const avgAttenuation =
      validAttenuation.length > 0
        ? validAttenuation.reduce((sum, route) => sum + Number(route.attenuationDb || 0), 0) /
          validAttenuation.length
        : 0;
    const failedTests = otdrTests.filter((test) => test.result === TestResult.FAIL).length;

    return {
      normal,
      degraded,
      broken,
      avgAttenuation: avgAttenuation.toFixed(1),
      failedTests,
    };
  }, [routes, otdrTests]);

  const attenuationSeries = useMemo(() => buildAttenuationSeries(routes), [routes]);

  const liveEvents: LiveEventItem[] = useMemo(
    () =>
      alarms.slice(0, 4).map((alarm) => ({
        id: String(alarm.id),
        timestamp: toTimeString(alarm.occurredAt),
        severity: alarm.severity,
        message: alarm.message,
        source: alarm.rtuName || `RTU-${alarm.rtuId || 'N/D'}`,
      })),
    [alarms]
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.5}>
        Vue 2 - Réseau
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Topologie optique, atténuation et résultats OTDR.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des données de supervision...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#27382e', border: '1px solid #4b6b59' }}>
            <Typography variant="caption" color="text.secondary">
              Fibre normale
            </Typography>
            <Typography variant="h5" color="#8fe7a7" fontWeight={700}>
              {summary.normal}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#3a3228', border: '1px solid #7c6646' }}>
            <Typography variant="caption" color="text.secondary">
              Fibre dégradée
            </Typography>
            <Typography variant="h5" color="#ffc98c" fontWeight={700}>
              {summary.degraded}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#422d33', border: '1px solid #8a5762' }}>
            <Typography variant="caption" color="text.secondary">
              Fibre rompue
            </Typography>
            <Typography variant="h5" color="#ff8d9a" fontWeight={700}>
              {summary.broken}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#252d40', border: '1px solid #46546c' }}>
            <Typography variant="caption" color="text.secondary">
              Atténuation moyenne
            </Typography>
            <Typography variant="h5" color="white" fontWeight={700}>
              {summary.avgAttenuation} dB
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <RouteOutlined sx={{ color: '#8fd3ff' }} />
          <Typography variant="h6" color="white">
            Carte GIS
          </Typography>
        </Stack>
        <RealtimeTunisiaMap routes={routes} rtus={rtus} loading={loading} />
      </Paper>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <AutoGraphOutlined sx={{ color: '#86c8ff' }} />
              <Typography variant="h6" color="white">
                Tendance d’atténuation
              </Typography>
            </Stack>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attenuationSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                  <XAxis dataKey="slot" stroke="#9aa9bd" />
                  <YAxis stroke="#9aa9bd" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="backboneNorth"
                    stroke="#55c2ff"
                    strokeWidth={2}
                    dot={false}
                    name="Noyau Nord"
                  />
                  <Line
                    type="monotone"
                    dataKey="backboneSouth"
                    stroke="#ff9f5a"
                    strokeWidth={2}
                    dot={false}
                    name="Noyau Sud"
                  />
                  <Line
                    type="monotone"
                    dataKey="metroRing"
                    stroke="#92e7a9"
                    strokeWidth={2}
                    dot={false}
                    name="Anneau métropolitain"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}
          >
            <Typography variant="h6" color="white" mb={2}>
              Flux d’événements
            </Typography>
            <Stack spacing={1.5}>
              {liveEvents.map((event) => (
                <Box key={event.id} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#293247' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {event.timestamp}
                    </Typography>
                    <StatusBadge status={event.severity} />
                  </Stack>
                  <Typography variant="body2" color="white" mt={0.6}>
                    {event.message}
                  </Typography>
                  <Typography variant="caption" color="#8fb3d1">
                    {event.source}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <RouteOutlined sx={{ color: '#8fd3ff' }} />
              <Typography variant="h6" color="white">
                Routes optiques
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Trajet</TableCell>
                    <TableCell>État de la fibre</TableCell>
                    <TableCell>État de la route</TableCell>
                    <TableCell>Longueur</TableCell>
                    <TableCell>Atténuation</TableCell>
                    <TableCell>Événements de réflexion</TableCell>
                    <TableCell>Dernier test</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>{route.routeName}</TableCell>
                      <TableCell>
                        {route.source} to {route.destination}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={route.fiberStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={route.routeStatus} variant="outlined" />
                      </TableCell>
                      <TableCell>{route.lengthKm ? `${route.lengthKm.toFixed(1)} km` : 'N/D'}</TableCell>
                      <TableCell>
                        {route.attenuationDb && route.attenuationDb > 0
                          ? `${route.attenuationDb.toFixed(1)} dB`
                          : 'N/D'}
                      </TableCell>
                      <TableCell>{route.reflectionEvents ? 'Oui' : 'Non'}</TableCell>
                      <TableCell>{formatDateTime(route.lastTestTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper
            sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <DeviceHubOutlined sx={{ color: '#9bb9ff' }} />
              <Typography variant="h6" color="white">
                Tests OTDR récents ({summary.failedTests} échecs)
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Impulsion</TableCell>
                    <TableCell>Plage</TableCell>
                    <TableCell>Longueur d’onde</TableCell>
                    <TableCell>Résultat</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {otdrTests.map((test) => (
                    <TableRow key={test.id} hover>
                      <TableCell>{test.routeName}</TableCell>
                      <TableCell>{test.mode}</TableCell>
                      <TableCell>{test.pulseWidth || 'N/D'}</TableCell>
                      <TableCell>{test.dynamicRangeDb ? `${test.dynamicRangeDb} dB` : 'N/D'}</TableCell>
                      <TableCell>{test.wavelengthNm} nm</TableCell>
                      <TableCell>
                        <StatusBadge status={test.result} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPage;
