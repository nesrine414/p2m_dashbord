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
  Breadcrumbs,
  Link,
} from '@mui/material';
import { AutoGraphOutlined, RouteOutlined, Home, Map as MapIcon } from '@mui/icons-material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../components/common';
import RealtimeTunisiaMap from '../components/widgets/RealtimeTunisiaMap';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
  getAlarms,
  getRecentOtdrTests,
  getRTUs,
  getRouteAttenuationTrend,
  getTopology,
  RouteAttenuationTrendPoint,
} from '../services/api';
import { FiberStatus } from '../types';
import getSocket from '../utils/socket';

interface TrendChartPoint {
  timestamp: string;
  timestampMs: number;
  attenuationDb: number | null;
  wavelengthNm: number;
  testResult: 'pass' | 'fail';
}

const TREND_WINDOW_OPTIONS = [
  { label: '1h', minutes: 60 },
  { label: '24h', minutes: 24 * 60 },
  { label: '7j', minutes: 7 * 24 * 60 },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'N/D';
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
};

const MonitoringPage: React.FC = () => {
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [trendWindowMinutes, setTrendWindowMinutes] = useState<number>(60);
  const [trendPoints, setTrendPoints] = useState<TrendChartPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadBaseData = async (showLoader = false) => {
      try {
        if (showLoader) setLoading(true);
        const [topologyResponse, otdrResponse, alarmResponse, rtuResponse] = await Promise.all([
          getTopology(),
          getRecentOtdrTests(),
          getAlarms({ page: 1, pageSize: 20 }),
          getRTUs(),
        ]);
        if (!active) return;
        setRoutes(topologyResponse.routes);
        setAlarms(alarmResponse.data);
        setRtus(rtuResponse);
        if (!selectedRouteId && topologyResponse.routes.length > 0) {
            setSelectedRouteId(topologyResponse.routes[0].id);
        }
      } catch {
        if (showLoader) setError('Erreur de chargement des données de supervision.');
      } finally {
        if (showLoader) setLoading(false);
      }
    };
    loadBaseData(true);
    const socket = getSocket();
    const refresh = () => loadBaseData(false);
    socket.on('new_alarm', refresh);
    socket.on('emulator_cycle_completed', refresh);
    const interval = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(interval); socket.off('new_alarm', refresh); };
  }, []);

  useEffect(() => {
    if (!selectedRouteId) return;
    let active = true;
    const loadTrend = async () => {
      try {
        setTrendLoading(true);
        const response = await getRouteAttenuationTrend(selectedRouteId, { windowMinutes: trendWindowMinutes, limit: 1000 });
        if (!active) return;
        const pts = response.points.map(p => ({
            timestampMs: new Date(p.timestamp).getTime(),
            timestamp: p.timestamp,
            attenuationDb: p.attenuationDb,
            wavelengthNm: p.wavelengthNm,
            testResult: p.testResult
        }));
        setTrendPoints(pts);
      } catch {
        setTrendPoints([]);
      } finally {
        setTrendLoading(false);
      }
    };
    loadTrend();
    return () => { active = false; };
  }, [selectedRouteId, trendWindowMinutes]);

  const summary = useMemo(() => ({
    normal: routes.filter(r => r.fiberStatus === FiberStatus.NORMAL).length,
    degraded: routes.filter(r => r.fiberStatus === FiberStatus.DEGRADED).length,
    broken: routes.filter(r => r.fiberStatus === FiberStatus.BROKEN).length,
  }), [routes]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5}>Supervision Réseau</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Typography color="text.primary">Monitoring</Typography>
            </Breadcrumbs>
        </Box>
        {loading && <CircularProgress size={20} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeft: '4px solid #28a745' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>FIBRES NORMALES</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.normal}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeft: '4px solid #ffc107' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>DÉGRADATIONS</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.degraded}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeft: '4px solid #dc3545' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>COPUES / RUPTURES</Typography>
            <Typography variant="h4" color="error.main" fontWeight={800}>{summary.broken}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="card-premium-light" sx={{ p: 0, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center' }}>
            <MapIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>Cartographie SIG Tunisie</Typography>
        </Box>
        <Box sx={{ height: 500, bgcolor: '#f8f9fa' }}>
            <RealtimeTunisiaMap routes={routes} rtus={rtus} loading={loading} />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="card-premium-light" sx={{ p: 2.5, minHeight: 450 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <AutoGraphOutlined color="primary" />
                    <Typography variant="h6" fontWeight={700}>Analyse d'Atténuation</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select value={selectedRouteId || ''} onChange={e => setSelectedRouteId(Number(e.target.value))}>
                            {routes.map(r => <MenuItem key={r.id} value={r.id}>{r.routeName}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <Select value={trendWindowMinutes} onChange={e => setTrendWindowMinutes(Number(e.target.value))}>
                            {TREND_WINDOW_OPTIONS.map(o => <MenuItem key={o.minutes} value={o.minutes}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
            </Stack>

            <Box sx={{ height: 320 }}>
                {trendLoading ? (
                    <Stack height="100%" alignItems="center" justifyContent="center"><CircularProgress size={30} /></Stack>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendPoints}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                            <XAxis 
                                dataKey="timestampMs" 
                                type="number" 
                                domain={['auto', 'auto']} 
                                tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                stroke="#6c757d"
                            />
                            <YAxis stroke="#6c757d" label={{ value: 'dB', angle: -90, position: 'insideLeft' }} />
                            <Tooltip 
                                labelFormatter={t => new Date(t).toLocaleString()}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line 
                                type="monotone" dataKey="attenuationDb" stroke="#007bff" 
                                strokeWidth={3} dot={{ r: 4, fill: '#007bff' }} activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper className="card-premium-light" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Événements Récents</Typography>
            <Stack spacing={2}>
              {alarms.slice(0, 5).map(a => (
                <Box key={a.id} sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, borderLeft: `4px solid ${a.severity === 'critical' ? '#dc3545' : '#ffc107'}` }}>
                  <Typography variant="caption" color="text.secondary">{formatDateTime(a.occurredAt)}</Typography>
                  <Typography variant="body2" fontWeight={700}>{a.message}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>{a.rtuName}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPage;
