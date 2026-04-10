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
import { NotificationsActiveOutlined } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import {
  BackendAlarm,
  closeAlarm,
  getAlarms,
  markAlarmInProgress,
} from '../services/api';
import { AlarmLifecycleStatus, AlarmSeverity } from '../types';
import getSocket from '../utils/socket';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const maybe = error as {
    response?: { data?: { error?: string; message?: string } };
  };

  return maybe?.response?.data?.error || maybe?.response?.data?.message || fallback;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatRealtimeUpdate = (value: string | null): string => {
  if (!value) {
    return 'En attente du flux live...';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `Derniere mise a jour temps reel: ${date.toLocaleTimeString()}`;
};

const isClosedStatus = (status: BackendAlarm['lifecycleStatus']): boolean =>
  status === AlarmLifecycleStatus.CLOSED ||
  status === AlarmLifecycleStatus.RESOLVED ||
  status === AlarmLifecycleStatus.CLEARED;

const normalizeLifecycleStatus = (status: unknown): BackendAlarm['lifecycleStatus'] => {
  if (
    status === 'active' ||
    status === 'acknowledged' ||
    status === 'in_progress' ||
    status === 'resolved' ||
    status === 'closed' ||
    status === 'cleared'
  ) {
    return status;
  }
  return 'active';
};

const normalizeSeverity = (severity: unknown): BackendAlarm['severity'] => {
  if (severity === 'critical' || severity === 'major' || severity === 'minor' || severity === 'info') {
    return severity;
  }
  return 'info';
};

const toBackendAlarm = (payload: unknown): BackendAlarm => {
  const source = payload as Record<string, unknown>;
  const id = Number(source.id ?? 0);
  const rtuId = source.rtuId ?? source.rtu_id;
  const occurredAt = source.occurredAt ?? source.occurred_at ?? new Date().toISOString();

  return {
    id: Number.isFinite(id) ? id : 0,
    rtuId: typeof rtuId === 'number' ? rtuId : rtuId ? Number(rtuId) : null,
    rtuName: typeof source.rtuName === 'string' ? source.rtuName : undefined,
    zone: typeof source.zone === 'string' ? source.zone : undefined,
    severity: normalizeSeverity(source.severity),
    lifecycleStatus: normalizeLifecycleStatus(source.lifecycleStatus ?? source.lifecycle_status),
    alarmType: (typeof source.alarmType === 'string' ? source.alarmType : 'Maintenance') as BackendAlarm['alarmType'],
    message: typeof source.message === 'string' ? source.message : 'Alarme detectee.',
    location: typeof source.location === 'string' ? source.location : null,
    localizationKm: typeof source.localizationKm === 'string' ? source.localizationKm : null,
    owner: typeof source.owner === 'string' ? source.owner : null,
    occurredAt: String(occurredAt),
  };
};

const AlarmsPage: React.FC = () => {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | AlarmSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlarmLifecycleStatus>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [lastRealtimeUpdateAt, setLastRealtimeUpdateAt] = useState<string | null>(null);

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
      } catch {
        if (!active) {
          return;
        }
        setError("Impossible de charger les donnees d'alarmes depuis le backend.");
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

  const replaceAlarm = (updatedAlarm: BackendAlarm) => {
    setAlarms((current) => {
      const existingIndex = current.findIndex((alarm) => alarm.id === updatedAlarm.id);
      if (existingIndex < 0) {
        return [updatedAlarm, ...current];
      }

      const cloned = [...current];
      cloned[existingIndex] = { ...cloned[existingIndex], ...updatedAlarm };
      return cloned;
    });
  };

  const prependOrReplaceAlarm = (incomingAlarm: BackendAlarm) => {
    setAlarms((current) => {
      const existingIndex = current.findIndex((alarm) => alarm.id === incomingAlarm.id);
      if (existingIndex >= 0) {
        const cloned = [...current];
        cloned[existingIndex] = { ...cloned[existingIndex], ...incomingAlarm };
        return cloned;
      }

      return [incomingAlarm, ...current];
    });
  };

  useEffect(() => {
    const markRealtimeUpdate = () => {
      setLastRealtimeUpdateAt(new Date().toISOString());
    };

    const handleNewAlarm = (event: Event) => {
      const customEvent = event as CustomEvent<BackendAlarm>;
      if (!customEvent.detail) {
        return;
      }

      prependOrReplaceAlarm(toBackendAlarm(customEvent.detail));
      markRealtimeUpdate();
    };

    const handleUpdatedAlarm = (event: Event) => {
      const customEvent = event as CustomEvent<BackendAlarm>;
      if (!customEvent.detail) {
        return;
      }

      replaceAlarm(toBackendAlarm(customEvent.detail));
      markRealtimeUpdate();
    };

    const socket = getSocket();
    const onSocketNewAlarm = (rawPayload: unknown) => {
      prependOrReplaceAlarm(toBackendAlarm(rawPayload));
      markRealtimeUpdate();
    };

    const onSocketUpdatedAlarm = (rawPayload: unknown) => {
      replaceAlarm(toBackendAlarm(rawPayload));
      markRealtimeUpdate();
    };

    window.addEventListener('nqms:alarm:new', handleNewAlarm as EventListener);
    window.addEventListener('nqms:alarm:updated', handleUpdatedAlarm as EventListener);
    socket.on('new_alarm', onSocketNewAlarm);
    socket.on('alarm_updated', onSocketUpdatedAlarm);

    return () => {
      window.removeEventListener('nqms:alarm:new', handleNewAlarm as EventListener);
      window.removeEventListener('nqms:alarm:updated', handleUpdatedAlarm as EventListener);
      socket.off('new_alarm', onSocketNewAlarm);
      socket.off('alarm_updated', onSocketUpdatedAlarm);
    };
  }, []);

  const handleInProgress = async (alarmId: number) => {
    try {
      setActionLoadingId(alarmId);
      setError(null);
      replaceAlarm(await markAlarmInProgress(alarmId));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible de passer l'alarme en cours de traitement."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClose = async (alarmId: number) => {
    try {
      setActionLoadingId(alarmId);
      setError(null);
      replaceAlarm(await closeAlarm(alarmId));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible de cloturer l'alarme."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAlarms = useMemo(
    () =>
      alarms.filter((alarm) => {
        const severityMatch = severityFilter === 'all' || alarm.severity === severityFilter;
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === AlarmLifecycleStatus.CLOSED
            ? isClosedStatus(alarm.lifecycleStatus)
            : alarm.lifecycleStatus === statusFilter);
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
      inProgress: alarms.filter((item) => item.lifecycleStatus === AlarmLifecycleStatus.IN_PROGRESS).length,
      closed: alarms.filter((item) => isClosedStatus(item.lifecycleStatus)).length,
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
            Alarmes et evenements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type, severite, statut, horodatage et localisation du defaut.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRealtimeUpdate(lastRealtimeUpdateAt)}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<NotificationsActiveOutlined />} sx={{ borderRadius: 2 }} disabled>
          Creer un incident
        </Button>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des alarmes...
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
              Critiques
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ff8d9a">
              {summary.critical}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#403327', border: '1px solid #8a6a45' }}>
            <Typography variant="caption" color="text.secondary">
              Majeures
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ffc47f">
              {summary.major}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#303b2a', border: '1px solid #5a7350' }}>
            <Typography variant="caption" color="text.secondary">
              Mineures
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#c3eca1">
              {summary.minor}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#3a2f43', border: '1px solid #746088' }}>
            <Typography variant="caption" color="text.secondary">
              Actives
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#d6a7ff">
              {summary.active}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#2e3948', border: '1px solid #516782' }}>
            <Typography variant="caption" color="text.secondary">
              En cours
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#9cc6ff">
              {summary.inProgress}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#2a373a', border: '1px solid #587a7f' }}>
            <Typography variant="caption" color="text.secondary">
              Cloturees
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#8ae8ef">
              {summary.closed}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} mb={1.4} flexWrap="wrap" useFlexGap>
        <Chip
          clickable
          label="Toutes les severites"
          color={severityFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setSeverityFilter('all')}
        />
        <Chip
          clickable
          label="Critiques"
          color={severityFilter === AlarmSeverity.CRITICAL ? 'error' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.CRITICAL)}
        />
        <Chip
          clickable
          label="Majeures"
          color={severityFilter === AlarmSeverity.MAJOR ? 'warning' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MAJOR)}
        />
        <Chip
          clickable
          label="Mineures"
          color={severityFilter === AlarmSeverity.MINOR ? 'success' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MINOR)}
        />
      </Stack>

      <Stack direction="row" spacing={1} mb={2.4} flexWrap="wrap" useFlexGap>
        <Chip
          clickable
          label="Tous les statuts"
          color={statusFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setStatusFilter('all')}
        />
        <Chip
          clickable
          label="Actives"
          color={statusFilter === AlarmLifecycleStatus.ACTIVE ? 'warning' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.ACTIVE)}
        />
        <Chip
          clickable
          label="Pris en compte"
          color={statusFilter === AlarmLifecycleStatus.ACKNOWLEDGED ? 'info' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.ACKNOWLEDGED)}
        />
        <Chip
          clickable
          label="En cours"
          color={statusFilter === AlarmLifecycleStatus.IN_PROGRESS ? 'warning' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.IN_PROGRESS)}
        />
        <Chip
          clickable
          label="Cloturees"
          color={statusFilter === AlarmLifecycleStatus.CLOSED ? 'success' : 'default'}
          onClick={() => setStatusFilter(AlarmLifecycleStatus.CLOSED)}
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              File active des alarmes
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severite</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>RTU</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Localisation</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlarms.map((alarm) => {
                    const loadingAction = actionLoadingId === alarm.id;
                    const closed = isClosedStatus(alarm.lifecycleStatus);
                    const isInProgress = alarm.lifecycleStatus === AlarmLifecycleStatus.IN_PROGRESS;

                    return (
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
                        <TableCell>{alarm.rtuName || `RTU-${alarm.rtuId || 'N/D'}`}</TableCell>
                        <TableCell>{formatDateTime(alarm.occurredAt)}</TableCell>
                        <TableCell>{alarm.localizationKm || 'N/D'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={loadingAction || closed || isInProgress}
                              onClick={() => handleInProgress(alarm.id)}
                            >
                              Prise en charge
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={loadingAction || closed}
                              onClick={() => handleClose(alarm.id)}
                            >
                              Cloturer
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Typography variant="h6" color="white" mb={2}>
                Repartition de severite par zone
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
                Procedure
              </Typography>
              <Stack spacing={1.2}>
                <Typography variant="body2" color="text.secondary">
                  1. Verifiez la localisation et isolez le segment impacte.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Cliquez sur Prise en charge pour passer directement en cours de traitement.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Une fois l intervention terminee, cloturez l alarme.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Une alarme cloturee manuellement n est plus recreee automatiquement.
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
