import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Breadcrumbs,
  Link,
} from '@mui/material';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { Home, Assessment } from '@mui/icons-material';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatusBadge from '../../components/common/StatusBadge';
import { BackendAlarm, getAlarms, getDashboardStats } from '../../services/api';
import { DashboardStats } from '../../types';
import getSocket from '../../utils/socket';

const PERIOD_OPTIONS = [
  { label: "Aujourd'hui", key: 'today', days: 1 },
  { label: '7 jours', key: '7d', days: 7 },
  { label: '30 jours', key: '30d', days: 30 },
];

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
};

const ReportsPage: React.FC = () => {
  const [periodKey, setPeriodKey] = useState<'today' | '7d' | '30d'>('7d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async (showLoader = false) => {
      try {
        if (showLoader) setLoading(true);
        const [statsData, alarmsData] = await Promise.all([
          getDashboardStats(),
          getAlarms({ page: 1, pageSize: 500 }),
        ]);
        if (!active) return;
        setStats(statsData);
        setAlarms(alarmsData.data);
      } catch {
        setError('Erreur de chargement des rapports.');
      } finally {
        setLoading(false);
      }
    };
    loadData(true);
    const socket = getSocket();
    const refresh = () => loadData(false);
    socket.on('kpi_updated', refresh);
    return () => { active = false; socket.off('kpi_updated', refresh); };
  }, []);

  const filteredAlarms = useMemo(() => {
    const days = PERIOD_OPTIONS.find(o => o.key === periodKey)?.days || 7;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return alarms.filter(a => new Date(a.occurredAt) >= threshold).sort((a,b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [alarms, periodKey]);

  const severityData = useMemo(() => [
    { name: 'Critique', value: filteredAlarms.filter(a => a.severity === 'critical').length, color: '#dc3545' },
    { name: 'Majeure', value: filteredAlarms.filter(a => a.severity === 'major').length, color: '#ffc107' },
    { name: 'Autre', value: filteredAlarms.filter(a => !['critical', 'major'].includes(a.severity)).length, color: '#007bff' },
  ].filter(d => d.value > 0), [filteredAlarms]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5}>Rapports Opérationnels</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Typography color="text.primary">Analytique</Typography>
            </Breadcrumbs>
        </Box>
        <Button variant="contained" startIcon={<FileDownloadOutlined />}>Exporter CSV</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper className="card-premium-light" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={1}>
            {PERIOD_OPTIONS.map(o => (
                <Chip key={o.key} label={o.label} color={periodKey === o.key ? 'primary' : 'default'} onClick={() => setPeriodKey(o.key as any)} />
            ))}
        </Stack>
      </Paper>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>ALARMES PÉRIODE</Typography>
            <Typography variant="h4" fontWeight={800}>{filteredAlarms.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>MTTR MOYEN</Typography>
            <Typography variant="h4" fontWeight={800}>{(stats?.mttr || 0).toFixed(2)}h</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>DISPONIBILITÉ</Typography>
            <Typography variant="h4" color="success.main" fontWeight={800}>{(stats?.availability || 0).toFixed(1)}%</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>MTBF</Typography>
            <Typography variant="h4" fontWeight={800}>{(stats?.mtbf || 0).toFixed(1)}h</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="card-premium-light" sx={{ p: 2.5, height: 350 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Distribution Sévérité</Typography>
            <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="card-premium-light" sx={{ p: 2.5, height: 350 }}>
            <Box sx={{ p: 0, overflow: 'hidden' }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={700}>Tableau de Bord Analytique</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 250 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8f9fa' }}>DATE</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8f9fa' }}>SÉVÉRITÉ</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8f9fa' }}>TYPE ALARME</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8f9fa' }}>LOCALISATION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredAlarms.slice(0, 10).map(a => (
                                <TableRow key={a.id} hover>
                                    <TableCell>{formatDateTime(a.occurredAt)}</TableCell>
                                    <TableCell><StatusBadge status={a.severity} /></TableCell>
                                    <TableCell>{a.alarmType}</TableCell>
                                    <TableCell>{a.localizationKm || 'N/D'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;
