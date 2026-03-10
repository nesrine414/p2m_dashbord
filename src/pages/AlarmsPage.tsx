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
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { NotificationsActiveOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import { AlarmLifecycleStatus, AlarmSeverity } from '../types';
import { BackendAlarm, getAlarms } from '../services/api';

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const AlarmsPage: React.FC = () => {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | AlarmSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlarmLifecycleStatus>('all');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getAlarms({ page: 1, pageSize: 500 });
        if (!active) {
          return;
        }

        setAlarms(response.data);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Unable to load alarm data from backend.');
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

  const filteredAlarms = useMemo(
    () =>
      alarms.filter((alarm) => {
        const severityMatch = severityFilter === 'all' || alarm.severity === severityFilter;
        const statusMatch = statusFilter === 'all' || alarm.lifecycleStatus === statusFilter;
        return severityMatch && statusMatch;
      }),
    [alarms, severityFilter, statusFilter]
  );

  const summary = useMemo(
    () => ({
      critical: alarms.filter((item) => item.severity === AlarmSeverity.CRITICAL).length,
      major: alarms.filter((item) => item.severity === AlarmSeverity.MAJOR).length,
      minor: alarms.filter((item) => item.severity === AlarmSeverity.MINOR).length,
      active: alarms.filter((item) => item.lifecycleStatus === AlarmLifecycleStatus.ACTIVE).length,
      acknowledged: alarms.filter((item) => item.lifecycleStatus === AlarmLifecycleStatus.ACKNOWLEDGED).length,
      cleared: alarms.filter((item) => item.lifecycleStatus === AlarmLifecycleStatus.CLEARED).length,
    }),
    [alarms]
  );

  const alarmZoneVolumes = useMemo(() => {
    const zoneMap = new Map<string, { zone: string; critical: number; major: number; minor: number }>();

    alarms.forEach((alarm) => {
      const zone = alarm.zone || alarm.location || 'Unknown zone';
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, { zone, critical: 0, major: 0, minor: 0 });
      }
      const entry = zoneMap.get(zone);
      if (!entry) {
        return;
      }
      if (alarm.severity === AlarmSeverity.CRITICAL) {
        entry.critical += 1;
      } else if (alarm.severity === AlarmSeverity.MAJOR) {
        entry.major += 1;
      } else if (alarm.severity === AlarmSeverity.MINOR) {
        entry.minor += 1;
      }
    });

    return Array.from(zoneMap.values()).slice(0, 8);
  }, [alarms]);

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
            Alarmes & Evenements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type, severite, statut, horodatage et localisation des defauts.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<NotificationsActiveOutlined />} sx={{ borderRadius: 2 }}>
          Create Incident Bridge
        </Button>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading alarms from backend...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#422d33', border: '1px solid #8a5762' }}>
            <Typography variant="caption" color="text.secondary">
              Critical
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ff8d9a">
              {summary.critical}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#403327', border: '1px solid #8a6a45' }}>
            <Typography variant="caption" color="text.secondary">
              Major
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ffc47f">
              {summary.major}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#303b2a', border: '1px solid #5a7350' }}>
            <Typography variant="caption" color="text.secondary">
              Minor
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#c3eca1">
              {summary.minor}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#3a2f43', border: '1px solid #746088' }}>
            <Typography variant="caption" color="text.secondary">
              Active
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#d6a7ff">
              {summary.active}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#2e3948', border: '1px solid #516782' }}>
            <Typography variant="caption" color="text.secondary">
              Acknowledged
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#9cc6ff">
              {summary.acknowledged}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#2a373a', border: '1px solid #587a7f' }}>
            <Typography variant="caption" color="text.secondary">
              Cleared
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#8ae8ef">
              {summary.cleared}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} mb={1.4} flexWrap="wrap" useFlexGap>
        <Chip
          clickable
          label="All severities"
          color={severityFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setSeverityFilter('all')}
        />
        <Chip
          clickable
          label="Critical"
          color={severityFilter === AlarmSeverity.CRITICAL ? 'error' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.CRITICAL)}
        />
        <Chip
          clickable
          label="Major"
          color={severityFilter === AlarmSeverity.MAJOR ? 'warning' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MAJOR)}
        />
        <Chip
          clickable
          label="Minor"
          color={severityFilter === AlarmSeverity.MINOR ? 'success' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MINOR)}
        />
      </Stack>

      <Stack direction="row" spacing={1} mb={2.4} flexWrap="wrap" useFlexGap>
        <Chip
          clickable
          label="All status"
          color={statusFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setStatusFilter('all')}
        />
        <Chip
          clickable
          label="Active"
          color={statusFilter === AlarmLifecycleStatus.ACTIVE ? 'warning' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.ACTIVE)}
        />
        <Chip
          clickable
          label="Acknowledged"
          color={statusFilter === AlarmLifecycleStatus.ACKNOWLEDGED ? 'info' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.ACKNOWLEDGED)}
        />
        <Chip
          clickable
          label="Cleared"
          color={statusFilter === AlarmLifecycleStatus.CLEARED ? 'success' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.CLEARED)}
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              Active Alarm Queue
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>RTU</TableCell>
                    <TableCell>Occurred At</TableCell>
                    <TableCell>Localization</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlarms.map((alarm) => (
                    <TableRow key={alarm.id} hover>
                      <TableCell>{alarm.id}</TableCell>
                      <TableCell>{alarm.alarmType}</TableCell>
                      <TableCell>
                        <StatusBadge status={alarm.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={alarm.lifecycleStatus} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>{alarm.message}</TableCell>
                      <TableCell>{alarm.rtuName || `RTU-${alarm.rtuId || 'N/A'}`}</TableCell>
                      <TableCell>{formatDateTime(alarm.occurredAt)}</TableCell>
                      <TableCell>{alarm.localizationKm || 'N/A'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" disabled>
                            Ack
                          </Button>
                          <Button size="small" variant="contained" disabled>
                            Resolve
                          </Button>
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
          <Stack spacing={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Typography variant="h6" color="white" mb={2}>
                Severity Heatmap by Zone
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alarmZoneVolumes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                    <XAxis dataKey="zone" stroke="#9aa9bd" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9aa9bd" />
                    <Tooltip />
                    <Bar dataKey="critical" stackId="a" fill="#f44336" />
                    <Bar dataKey="major" stackId="a" fill="#ff9800" />
                    <Bar dataKey="minor" stackId="a" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Typography variant="h6" color="white" mb={1.4}>
                Playbook
              </Typography>
              <Stack spacing={1.2}>
                <Typography variant="body2" color="text.secondary">
                  1. Verify localization and isolate impacted segment.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Run OTDR manual test with 1550 nm and compare reference trace.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Acknowledge alarm in NOC and assign owner.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Mark cleared only after optical budget returns below threshold.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlarmsPage;
