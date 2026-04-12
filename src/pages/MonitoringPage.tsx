import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AutoGraphOutlined, DeviceHubOutlined, RouteOutlined } from '@mui/icons-material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import RealtimeTunisiaMap from '../components/widgets/RealtimeTunisiaMap';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
  EmulatorThresholdsConfig,
  getEmulatorThresholds,
  getAlarms,
  getRecentOtdrTests,
  getRTUs,
  getRouteAttenuationTrend,
  getTopology,
  RouteAttenuationTrendPoint,
} from '../services/api';
import { FiberStatus, TestResult } from '../types';
import getSocket from '../utils/socket';

interface LiveEventItem {
  id: string;
  timestamp: string;
  severity: string;
  message: string;
  source: string;
}

interface TrendChartPoint {
  timestamp: string;
  timestampMs: number;
  attenuationDb: number | null;
  wavelengthNm: number;
  testResult: 'pass' | 'fail';
}

interface TrendWindowOption {
  label: string;
  minutes: number;
}

const TREND_WINDOW_OPTIONS: TrendWindowOption[] = [
  { label: '1h', minutes: 60 },
  { label: '24h', minutes: 24 * 60 },
  { label: '7j', minutes: 7 * 24 * 60 },
];

const DEFAULT_TREND_WINDOW_MINUTES = TREND_WINDOW_OPTIONS[0].minutes;

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

const toTrendChartPoints = (points: RouteAttenuationTrendPoint[]): TrendChartPoint[] =>
  points.map((point) => ({
    timestampMs: new Date(point.timestamp).getTime(),
    timestamp: point.timestamp,
    attenuationDb: point.attenuationDb,
    wavelengthNm: point.wavelengthNm,
    testResult: point.testResult,
  }))
  .filter((point) => Number.isFinite(point.timestampMs));

const getTrendWindowLabel = (minutes: number): string =>
  TREND_WINDOW_OPTIONS.find((option) => option.minutes === minutes)?.label || `${minutes} min`;

const getTrendLimit = (windowMinutes: number): number => {
  if (windowMinutes <= 60) {
    return 240;
  }

  if (windowMinutes <= 24 * 60) {
    return 1200;
  }

  return 5000;
};

const formatTrendTick = (timestampMs: number, windowMinutes: number): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  if (windowMinutes <= 60) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (windowMinutes <= 24 * 60) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit' });
};

const getTrendTimeDomain = (windowMinutes: number): [number, number] => {
  const now = new Date();

  if (windowMinutes === 24 * 60) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(24, 0, 0, 0);
    return [start.getTime(), end.getTime()];
  }

  if (windowMinutes === 7 * 24 * 60) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return [start.getTime(), end.getTime()];
  }

  return [now.getTime() - windowMinutes * 60_000, now.getTime()];
};

const getTrendTimeTicks = (windowMinutes: number, domain: [number, number]): number[] => {
  const [start, end] = domain;
  if (end <= start) {
    return [start, end];
  }

  const stepMs =
    windowMinutes === 24 * 60
      ? 2 * 60 * 60 * 1000
      : windowMinutes === 7 * 24 * 60
        ? 24 * 60 * 60 * 1000
        : 10 * 60 * 1000;

  const ticks: number[] = [];
  for (let current = start; current <= end; current += stepMs) {
    ticks.push(current);
  }

  if (ticks[ticks.length - 1] !== end) {
    ticks.push(end);
  }

  return ticks;
};

const getBucketStartMs = (timestampMs: number, windowMinutes: number): number => {
  const date = new Date(timestampMs);
  if (windowMinutes <= 24 * 60) {
    date.setMinutes(0, 0, 0);
    return date.getTime();
  }

  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const aggregateTrendPoints = (points: TrendChartPoint[], windowMinutes: number): TrendChartPoint[] => {
  const sorted = points
    .slice()
    .sort((left, right) => left.timestampMs - right.timestampMs);

  if (windowMinutes <= 60) {
    return sorted;
  }

  const bucketMap = new Map<
    number,
    {
      sum: number;
      count: number;
      wavelengthNm: number;
      hasFail: boolean;
    }
  >();

  sorted.forEach((point) => {
    const bucketStart = getBucketStartMs(point.timestampMs, windowMinutes);
    const existing = bucketMap.get(bucketStart);
    const value = point.attenuationDb;
    const hasNumeric = typeof value === 'number' && Number.isFinite(value);

    if (!existing) {
      bucketMap.set(bucketStart, {
        sum: hasNumeric ? value : 0,
        count: hasNumeric ? 1 : 0,
        wavelengthNm: point.wavelengthNm,
        hasFail: point.testResult === 'fail',
      });
      return;
    }

    if (hasNumeric) {
      existing.sum += value;
      existing.count += 1;
    }

    existing.wavelengthNm = point.wavelengthNm;
    existing.hasFail = existing.hasFail || point.testResult === 'fail';
  });

  return Array.from(bucketMap.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([timestampMs, value]) => ({
      timestampMs,
      timestamp: new Date(timestampMs).toISOString(),
      attenuationDb: value.count > 0 ? Number((value.sum / value.count).toFixed(2)) : null,
      wavelengthNm: value.wavelengthNm,
      testResult: value.hasFail ? 'fail' : 'pass',
    }));
};

const MonitoringPage: React.FC = () => {
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [otdrTests, setOtdrTests] = useState<BackendOtdrTest[]>([]);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [trendWindowMinutes, setTrendWindowMinutes] = useState<number>(DEFAULT_TREND_WINDOW_MINUTES);
  const [trendRouteName, setTrendRouteName] = useState<string>('Route selectionnee');
  const [trendPoints, setTrendPoints] = useState<TrendChartPoint[]>([]);
  const [trendThresholds, setTrendThresholds] = useState<EmulatorThresholdsConfig['fibre']['attenuationDb'] | null>(
    null
  );
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBaseData = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
          setError(null);
        }

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
      } catch {
        if (!active) {
          return;
        }
        if (showLoader) {
          setError('Impossible de charger les donnees de supervision depuis le backend.');
        }
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    };

    void loadBaseData(true);

    const socket = getSocket();
    const onRealtimeUpdate = () => {
      void loadBaseData(false);
    };

    socket.on('emulator_cycle_completed', onRealtimeUpdate);
    socket.on('new_alarm', onRealtimeUpdate);
    socket.on('alarm_updated', onRealtimeUpdate);

    const refreshInterval = window.setInterval(() => {
      void loadBaseData(false);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      socket.off('emulator_cycle_completed', onRealtimeUpdate);
      socket.off('new_alarm', onRealtimeUpdate);
      socket.off('alarm_updated', onRealtimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (routes.length === 0) {
      return;
    }

    if (selectedRouteId && routes.some((route) => route.id === selectedRouteId)) {
      return;
    }

    setSelectedRouteId(routes[0].id);
  }, [routes, selectedRouteId]);

  useEffect(() => {
    let active = true;

    const loadThresholds = async () => {
      try {
        const thresholds = await getEmulatorThresholds();
        if (!active) {
          return;
        }

        setTrendThresholds(thresholds.fibre.attenuationDb);
      } catch {
        if (!active) {
          return;
        }

        setTrendThresholds(null);
      }
    };

    void loadThresholds();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRouteId) {
      setTrendPoints([]);
      return;
    }

    let active = true;

    const loadTrend = async () => {
      try {
        setTrendLoading(true);
        const response = await getRouteAttenuationTrend(selectedRouteId, {
          windowMinutes: trendWindowMinutes,
          limit: getTrendLimit(trendWindowMinutes),
        });

        if (!active) {
          return;
        }

        setTrendRouteName(response.routeName);
        setTrendPoints(toTrendChartPoints(response.points));
      } catch {
        if (!active) {
          return;
        }
        setTrendPoints([]);
      } finally {
        if (active) {
          setTrendLoading(false);
        }
      }
    };

    void loadTrend();

    const socket = getSocket();
    const onRealtimeUpdate = () => {
      void loadTrend();
    };

    socket.on('emulator_cycle_completed', onRealtimeUpdate);
    socket.on('new_alarm', onRealtimeUpdate);
    socket.on('alarm_updated', onRealtimeUpdate);

    const refreshInterval = window.setInterval(() => {
      void loadTrend();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      socket.off('emulator_cycle_completed', onRealtimeUpdate);
      socket.off('new_alarm', onRealtimeUpdate);
      socket.off('alarm_updated', onRealtimeUpdate);
    };
  }, [selectedRouteId, trendWindowMinutes]);

  const trendDisplayPoints = useMemo<TrendChartPoint[]>(
    () => aggregateTrendPoints(trendPoints, trendWindowMinutes),
    [trendPoints, trendWindowMinutes]
  );

  const trendDomain = useMemo<[number, number]>(() => {
    const numericValues = trendDisplayPoints
      .map((point) => point.attenuationDb)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (trendThresholds) {
      numericValues.push(trendThresholds.warning, trendThresholds.critical);
    }

    if (numericValues.length === 0) {
      return [0, 5];
    }

    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    const margin = Math.max(0.5, (maxValue - minValue) * 0.15);

    return [Math.max(0, Number((minValue - margin).toFixed(2))), Number((maxValue + margin).toFixed(2))];
  }, [trendDisplayPoints, trendThresholds]);

  const trendTimeDomain = useMemo<[number, number]>(
    () => getTrendTimeDomain(trendWindowMinutes),
    [trendWindowMinutes]
  );

  const trendTimeTicks = useMemo<number[]>(
    () => getTrendTimeTicks(trendWindowMinutes, trendTimeDomain),
    [trendWindowMinutes, trendTimeDomain]
  );

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

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.5}>
        Vue 2 - Reseau
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Topologie optique, attenuation et resultats OTDR.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des donnees de supervision...
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
              Fibre degradee
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
              Attenuation moyenne
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
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
              mb={2}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoGraphOutlined sx={{ color: '#86c8ff' }} />
                <Typography variant="h6" color="white">
                  Tendance attenuation par route
                </Typography>
              </Stack>
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel id="route-trend-label">Route optique</InputLabel>
                <Select
                  labelId="route-trend-label"
                  value={selectedRouteId ?? ''}
                  label="Route optique"
                  onChange={(event) => setSelectedRouteId(Number(event.target.value))}
                >
                  {routes.map((route) => (
                    <MenuItem key={route.id} value={route.id}>
                      {route.routeName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="route-trend-window-label">Periode</InputLabel>
                <Select
                  labelId="route-trend-window-label"
                  value={trendWindowMinutes}
                  label="Periode"
                  onChange={(event) => setTrendWindowMinutes(Number(event.target.value))}
                >
                  {TREND_WINDOW_OPTIONS.map((option) => (
                    <MenuItem key={option.minutes} value={option.minutes}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {selectedRoute ? `${selectedRoute.source} -> ${selectedRoute.destination}` : 'Aucune route selectionnee'}
              {' | '}
              Fenetre: {getTrendWindowLabel(trendWindowMinutes)}
              {' | '}
              Points: {trendDisplayPoints.length}
              {trendThresholds
                ? ` | Seuils: warning ${trendThresholds.warning} ${trendThresholds.unit}, critical ${trendThresholds.critical} ${trendThresholds.unit}`
                : ''}
            </Typography>

            <Box sx={{ height: 320 }}>
              {trendLoading ? (
                <Stack height="100%" direction="row" alignItems="center" justifyContent="center">
                  <CircularProgress size={20} />
                </Stack>
              ) : trendDisplayPoints.length === 0 ? (
                <Stack height="100%" direction="row" alignItems="center" justifyContent="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucune mesure attenuation disponible pour {trendRouteName}.
                  </Typography>
                </Stack>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendDisplayPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                    <XAxis
                      type="number"
                      scale="time"
                      dataKey="timestampMs"
                      domain={trendTimeDomain}
                      ticks={trendTimeTicks}
                      stroke="#9aa9bd"
                      tickFormatter={(value: number) => formatTrendTick(value, trendWindowMinutes)}
                      minTickGap={40}
                      interval={0}
                    />
                    <YAxis stroke="#9aa9bd" domain={trendDomain} />
                    <Tooltip
                      formatter={(value: any) =>
                        typeof value === 'number' ? `${value.toFixed(2)} dB` : 'N/D'
                      }
                      labelFormatter={(_label: any, payload: readonly any[]) => {
                        const item = payload?.[0]?.payload;
                        return item ? formatDateTime(item.timestamp) : '';
                      }}
                    />
                    {trendThresholds && (
                      <>
                        <Line
                          type="linear"
                          dataKey={() => trendThresholds.warning}
                          stroke="#ffb347"
                          strokeWidth={1.5}
                          dot={false}
                          name={`Seuil warning (${trendThresholds.warning} ${trendThresholds.unit})`}
                        />
                        <Line
                          type="linear"
                          dataKey={() => trendThresholds.critical}
                          stroke="#ff6f7a"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                          name={`Seuil critical (${trendThresholds.critical} ${trendThresholds.unit})`}
                        />
                      </>
                    )}
                    <Line
                      type="monotoneX"
                      dataKey="attenuationDb"
                      stroke="#55c2ff"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#55c2ff', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Atténuation mesurée"
                      connectNulls
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Flux d'evenements
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
                    <TableCell>Etat fibre</TableCell>
                    <TableCell>Etat route</TableCell>
                    <TableCell>Longueur</TableCell>
                    <TableCell>Attenuation</TableCell>
                    <TableCell>Reflexion</TableCell>
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
                        {route.attenuationDb && route.attenuationDb > 0 ? `${route.attenuationDb.toFixed(1)} dB` : 'N/D'}
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
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <DeviceHubOutlined sx={{ color: '#9bb9ff' }} />
              <Typography variant="h6" color="white">
                Tests OTDR recents ({summary.failedTests} echecs)
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
                    <TableCell>Lambda</TableCell>
                    <TableCell>Resultat</TableCell>
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
