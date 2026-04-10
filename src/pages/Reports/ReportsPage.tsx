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
} from '@mui/material';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import StatusBadge from '../../components/common/StatusBadge';
import { BackendAlarm, getAlarms, getDashboardStats } from '../../services/api';
import { DashboardStats } from '../../types';
import getSocket from '../../utils/socket';

type PeriodOption = {
  label: string;
  key: 'today' | '7d' | '30d';
  days: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Aujourd'hui", key: 'today', days: 1 },
  { label: '7 jours', key: '7d', days: 7 },
  { label: '30 jours', key: '30d', days: 30 },
];

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

const isOpenAlarm = (status: BackendAlarm['lifecycleStatus']): boolean =>
  status === 'active' || status === 'acknowledged' || status === 'in_progress';

const ReportsPage: React.FC = () => {
  const [periodKey, setPeriodKey] = useState<PeriodOption['key']>('7d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
          setError(null);
        }

        const [statsResponse, alarmsResponse] = await Promise.all([
          getDashboardStats(),
          getAlarms({ page: 1, pageSize: 500 }),
        ]);

        if (!active) {
          return;
        }

        setStats(statsResponse);
        setAlarms(alarmsResponse.data);
      } catch {
        if (!active) {
          return;
        }
        if (showLoader) {
          setError('Impossible de charger les rapports depuis le backend.');
        }
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    };

    void loadData(true);

    const socket = getSocket();
    const onRealtimeUpdate = () => {
      void loadData(false);
    };

    socket.on('emulator_cycle_completed', onRealtimeUpdate);
    socket.on('new_alarm', onRealtimeUpdate);
    socket.on('alarm_updated', onRealtimeUpdate);
    socket.on('kpi_updated', onRealtimeUpdate);

    return () => {
      active = false;
      socket.off('emulator_cycle_completed', onRealtimeUpdate);
      socket.off('new_alarm', onRealtimeUpdate);
      socket.off('alarm_updated', onRealtimeUpdate);
      socket.off('kpi_updated', onRealtimeUpdate);
    };
  }, []);

  const selectedPeriod = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.key === periodKey) || PERIOD_OPTIONS[1],
    [periodKey]
  );

  const fromDate = useMemo(() => {
    const now = new Date();
    if (selectedPeriod.key === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (selectedPeriod.days - 1));
    return start;
  }, [selectedPeriod.days, selectedPeriod.key]);

  const filteredAlarms = useMemo(
    () =>
      alarms
        .filter((alarm) => {
          const occurredAt = new Date(alarm.occurredAt);
          return !Number.isNaN(occurredAt.getTime()) && occurredAt >= fromDate;
        })
        .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()),
    [alarms, fromDate]
  );

  const reportSummary = useMemo(() => {
    const critical = filteredAlarms.filter((alarm) => alarm.severity === 'critical').length;
    const major = filteredAlarms.filter((alarm) => alarm.severity === 'major').length;
    const open = filteredAlarms.filter((alarm) => isOpenAlarm(alarm.lifecycleStatus)).length;
    const closed = filteredAlarms.length - open;

    return {
      critical,
      major,
      open,
      closed,
    };
  }, [filteredAlarms]);

  const exportCsv = () => {
    const headers = [
      'ID',
      'Date',
      'Type',
      'Severite',
      'Statut',
      'RTU',
      'Message',
      'Localisation',
    ];

    const rows = filteredAlarms.map((alarm) => [
      String(alarm.id),
      formatDateTime(alarm.occurredAt),
      alarm.alarmType,
      alarm.severity,
      alarm.lifecycleStatus,
      alarm.rtuName || `RTU-${alarm.rtuId || 'N/D'}`,
      alarm.message,
      alarm.localizationKm || alarm.location || 'N/D',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rapport-incidents-${selectedPeriod.key}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="white">
            Rapports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resume KPI et incidents exportables par periode.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FileDownloadOutlined />} onClick={exportCsv}>
          Export CSV
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} mb={2.2} flexWrap="wrap" useFlexGap>
        {PERIOD_OPTIONS.map((option) => (
          <Chip
            key={option.key}
            clickable
            label={option.label}
            color={periodKey === option.key ? 'primary' : 'default'}
            onClick={() => setPeriodKey(option.key)}
          />
        ))}
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement du rapport...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#422d33', border: '1px solid #8a5762' }}>
            <Typography variant="caption" color="text.secondary">
              Critiques
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ff9aa5">
              {reportSummary.critical}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#3b3126', border: '1px solid #7a6442' }}>
            <Typography variant="caption" color="text.secondary">
              Majeures
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ffcb8b">
              {reportSummary.major}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2f3950', border: '1px solid #5a6c89' }}>
            <Typography variant="caption" color="text.secondary">
              En cours
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#a9c8ff">
              {reportSummary.open}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2a373a', border: '1px solid #587a7f' }}>
            <Typography variant="caption" color="text.secondary">
              Cloturees
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#8be8ef">
              {reportSummary.closed}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2d3250', border: '1px solid #5f6294' }}>
            <Typography variant="caption" color="text.secondary">
              KPI reseau
            </Typography>
            <Typography variant="body2" color="white" mt={0.8}>
              Disponibilite: <strong>{(stats?.availability || 0).toFixed(1)}%</strong>
            </Typography>
            <Typography variant="body2" color="white">
              MTTR: <strong>{(stats?.mttr || 0).toFixed(2)}h</strong>
            </Typography>
            <Typography variant="body2" color="white">
              MTBF: <strong>{(stats?.mtbf || 0).toFixed(1)}h</strong>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
        <Typography variant="h6" color="white" mb={2}>
          Incidents sur la periode {selectedPeriod.label}
        </Typography>

        {filteredAlarms.length === 0 ? (
          <Alert severity="info">Aucun incident sur la periode selectionnee.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severite</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>RTU</TableCell>
                  <TableCell>Localisation</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAlarms.map((alarm) => (
                  <TableRow key={alarm.id} hover>
                    <TableCell>{alarm.id}</TableCell>
                    <TableCell>{formatDateTime(alarm.occurredAt)}</TableCell>
                    <TableCell>{alarm.alarmType}</TableCell>
                    <TableCell>
                      <StatusBadge status={alarm.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alarm.lifecycleStatus} variant="outlined" />
                    </TableCell>
                    <TableCell>{alarm.rtuName || `RTU-${alarm.rtuId || 'N/D'}`}</TableCell>
                    <TableCell>{alarm.localizationKm || alarm.location || 'N/D'}</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>{alarm.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default ReportsPage;
