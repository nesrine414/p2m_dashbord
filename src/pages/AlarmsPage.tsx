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
  TextField,
  InputAdornment,
} from '@mui/material';
import { NotificationsActiveOutlined, Home, ErrorOutline, SearchOutlined, FilterListOutlined } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import {
  BackendAlarm,
  closeAlarm,
  getAlarms,
  markAlarmInProgress,
} from '../services/api';
import { AlarmLifecycleStatus, AlarmSeverity } from '../types';
import getSocket from '../utils/socket';

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
};

const AlarmsPage: React.FC = () => {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | AlarmSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlarmLifecycleStatus>('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadAlarms = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const response = await getAlarms({ page: 1, pageSize: 500 });
      setAlarms(response.data);
    } catch {
      setError("Erreur technique lors de la synchronisation des alarmes.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadAlarms(true);
    const socket = getSocket();
    const refresh = () => loadAlarms(false);
    socket.on('new_alarm', refresh);
    socket.on('alarm_updated', refresh);
    return () => { socket.off('new_alarm', refresh); socket.off('alarm_updated', refresh); };
  }, []);

  const handleAction = async (id: number, action: 'progress' | 'close') => {
    try {
      setActionLoadingId(id);
      if (action === 'progress') await markAlarmInProgress(id);
      else await closeAlarm(id);
      await loadAlarms(false);
    } catch {
      setError("Échec de l'action sur l'alarme. Vérifiez vos permissions.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAlarms = useMemo(() => alarms.filter(a => {
    const sevMatch = severityFilter === 'all' || a.severity === severityFilter;
    const statMatch = statusFilter === 'all' || (statusFilter === 'closed' ? ['closed', 'resolved', 'cleared'].includes(a.lifecycleStatus) : a.lifecycleStatus === statusFilter);
    const searchMatch = !search || 
        a.message.toLowerCase().includes(search.toLowerCase()) || 
        a.rtuName?.toLowerCase().includes(search.toLowerCase()) ||
        a.alarmType.toLowerCase().includes(search.toLowerCase());
    return sevMatch && statMatch && searchMatch;
  }), [alarms, severityFilter, statusFilter, search]);

  const summary = useMemo(() => ({
    critical: alarms.filter(a => a.severity === 'critical').length,
    major: alarms.filter(a => a.severity === 'major').length,
    active: alarms.filter(a => a.lifecycleStatus === 'active').length,
    inProgress: alarms.filter(a => a.lifecycleStatus === 'in_progress').length,
    closed: alarms.filter(a => ['closed', 'resolved', 'cleared'].includes(a.lifecycleStatus)).length,
  }), [alarms]);

  const chartData = useMemo(() => {
    const zones = new Map();
    alarms.forEach(a => {
        const z = a.zone || 'Autre';
        if (!zones.has(z)) zones.set(z, { name: z, critical: 0, major: 0 });
        const entry = zones.get(z);
        if (a.severity === 'critical') entry.critical++;
        else if (a.severity === 'major') entry.major++;
    });
    return Array.from(zones.values()).slice(0, 5).sort((a: any, b: any) => (b.critical + b.major) - (a.critical + a.major));
  }, [alarms]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5} fontWeight={800}>Centre d'Alarmes & Incidents</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Typography color="text.primary">Supervision Live</Typography>
            </Breadcrumbs>
        </Box>
        {loading && <CircularProgress size={20} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeftWidth: '8px', borderLeftColor: '#dc3545' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>CRITIQUES</Typography>
            <Typography variant="h4" color="error.main" fontWeight={800}>{summary.critical}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeftWidth: '8px', borderLeftColor: '#ffc107' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>MAJEURES</Typography>
            <Typography variant="h4" color="warning.main" fontWeight={800}>{summary.major}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeftWidth: '8px', borderLeftColor: '#17a2b8' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>ACTIVES</Typography>
            <Typography variant="h4" color="info.main" fontWeight={800}>{summary.active}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeftWidth: '8px', borderLeftColor: '#fd7e14' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>EN COURS</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.inProgress}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderLeftWidth: '8px', borderLeftColor: '#28a745' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>CLÔTURÉES</Typography>
            <Typography variant="h4" color="success.main" fontWeight={800}>{summary.closed}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="card-premium-light" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField 
                size="small" fullWidth placeholder="Rechercher une alarme, une unité RTU ou un type d'incident..."
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined color="action" /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                <Chip icon={<FilterListOutlined />} label="Tous" color={severityFilter === 'all' ? 'primary' : 'default'} onClick={() => setSeverityFilter('all')} />
                <Chip label="Critiques" color={severityFilter === 'critical' ? 'error' : 'default'} onClick={() => setSeverityFilter('critical' as any)} />
                <Chip label="Majeures" color={severityFilter === 'major' ? 'warning' : 'default'} onClick={() => setSeverityFilter('major' as any)} />
                <Box sx={{ width: '1px', bgcolor: 'divider', height: 24, mx: 1 }} />
                <Chip label="Actives" variant={statusFilter === 'active' ? 'filled' : 'outlined'} onClick={() => setStatusFilter('active' as any)} />
                <Chip label="Clôturées" variant={statusFilter === 'closed' ? 'filled' : 'outlined'} onClick={() => setStatusFilter('closed' as any)} />
            </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="card-premium-light" sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center' }}>
                <NotificationsActiveOutlined sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={800}>Journal des Incidents en Temps Réel</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>DATE / HEURE</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>SÉVÉRITÉ</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>STATUT</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa', width: '30%' }}>MESSAGE D'ALARME</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>UNITÉ RTU</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa', textAlign: 'center' }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlarms.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Aucune alarme correspondante trouvée.</TableCell></TableRow>
                  ) : filteredAlarms.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(a.occurredAt)}</TableCell>
                      <TableCell><StatusBadge status={a.severity} /></TableCell>
                      <TableCell><StatusBadge status={a.lifecycleStatus} variant="outlined" /></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: a.severity === 'critical' ? 'error.main' : 'text.primary' }}>{a.message}</TableCell>
                      <TableCell>{a.rtuName}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                            <Button 
                                size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}
                                disabled={actionLoadingId === a.id || a.lifecycleStatus !== 'active'}
                                onClick={() => handleAction(a.id, 'progress')}
                            >PRENDRE</Button>
                            <Button 
                                size="small" variant="contained" color="primary" sx={{ fontSize: '0.7rem' }}
                                disabled={actionLoadingId === a.id || ['closed', 'resolved'].includes(a.lifecycleStatus)}
                                onClick={() => handleAction(a.id, 'close')}
                            >CLÔTURER</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
            <Paper className="card-premium-light" sx={{ p: 2.5, mb: 3 }}>
                <Typography variant="h6" fontWeight={800} mb={2}>Zones les plus impactées</Typography>
                <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" stroke="#6c757d" tick={{ fontSize: 10, fontWeight: 600 }} />
                            <YAxis stroke="#6c757d" tick={{ fontSize: 11 }} />
                            <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{ borderRadius: 12, border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                            <Bar dataKey="critical" name="Critique" fill="#dc3545" radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="major" name="Majeure" fill="#ffc107" radius={[6, 6, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

            <Paper className="card-premium-light" sx={{ p: 2.5, bgcolor: '#e7f3ff', border: 'none', borderLeft: '4px solid #007bff' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <ErrorOutline color="primary" />
                    <Typography fontWeight={800} color="primary.main">Protocole Intervention</Typography>
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.9, color: 'primary.dark', lineHeight: 1.6 }}>
                    En cas de coupure de fibre détectée, veuillez acquitter l'alarme ("PRENDRE") avant de lancer un test OTDR de diagnostic. 
                    Une fois l'incident corrigé, n'oubliez pas de "CLÔTURER" l'alarme pour l'historique KPI.
                </Typography>
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlarmsPage;
