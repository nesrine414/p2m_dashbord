import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
} from '@mui/material';
import { AddAlertOutlined } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendRTU,
  closeAlarm,
  createAlarm,
  getAlarms,
  getRTUs,
  getTopology,
  markAlarmInProgress,
} from '../services/api';
import { AuthUser, me } from '../services/auth';
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
  const fibreId = source.fibreId ?? source.fibre_id;
  const routeId = source.routeId ?? source.route_id;
  const occurredAt = source.occurredAt ?? source.occurred_at ?? new Date().toISOString();

  return {
    id: Number.isFinite(id) ? id : 0,
    rtuId: typeof rtuId === 'number' ? rtuId : rtuId ? Number(rtuId) : null,
    fibreId: typeof fibreId === 'number' ? fibreId : fibreId ? Number(fibreId) : null,
    routeId: typeof routeId === 'number' ? routeId : routeId ? Number(routeId) : null,
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

type ManualAlarmForm = {
  rtuId: string;
  routeId: string;
  severity: BackendAlarm['severity'];
  alarmType: BackendAlarm['alarmType'];
  message: string;
  location: string;
  localizationKm: string;
};

const createEmptyManualAlarmForm = (): ManualAlarmForm => ({
  rtuId: '',
  routeId: '',
  severity: 'major',
  alarmType: 'Maintenance',
  message: '',
  location: '',
  localizationKm: '',
});

const AlarmsPage: React.FC = () => {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | AlarmSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlarmLifecycleStatus>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [lastRealtimeUpdateAt, setLastRealtimeUpdateAt] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [manualAlarmForm, setManualAlarmForm] = useState<ManualAlarmForm>(createEmptyManualAlarmForm);
  const isAdmin = currentUser?.role === 'admin';

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

        const [rtuResult, topologyResult, profileResult] = await Promise.allSettled([
          getRTUs(),
          getTopology(),
          me(),
        ]);

        if (!active) {
          return;
        }

        if (rtuResult.status === 'fulfilled') {
          setRtus(rtuResult.value);
        }

        if (topologyResult.status === 'fulfilled') {
          setRoutes(topologyResult.value.routes);
        }

        if (profileResult.status === 'fulfilled') {
          setCurrentUser(profileResult.value);
        }
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError(getApiErrorMessage(apiError, "Impossible de charger les donnees d'alarmes depuis le backend."));
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

  const handleManualAlarmRtuChange = (rtuId: string) => {
    const selectedRtu = rtus.find((rtu) => String(rtu.id) === rtuId);
    setManualAlarmForm((current) => ({
      ...current,
      rtuId,
      routeId: '',
      location: selectedRtu?.locationAddress || current.location,
    }));
  };

  const handleManualAlarmRouteChange = (routeId: string) => {
    const selectedRoute = routes.find((route) => String(route.id) === routeId);
    setManualAlarmForm((current) => ({
      ...current,
      routeId,
      location: selectedRoute ? `${selectedRoute.source} - ${selectedRoute.destination}` : current.location,
      localizationKm:
        selectedRoute && typeof selectedRoute.lengthKm === 'number'
          ? `KM ${selectedRoute.lengthKm.toFixed(2)}`
          : current.localizationKm,
    }));
  };

  const handleCreateManualAlarm = async () => {
    if (currentUser && !isAdmin) {
      setError("Seul l'admin peut creer une alarme manuellement.");
      return;
    }

    if (!manualAlarmForm.rtuId) {
      setError('Choisissez une RTU pour cette alarme.');
      return;
    }

    if (!manualAlarmForm.routeId) {
      setError('Choisissez une route pour cette alarme.');
      return;
    }

    const message = manualAlarmForm.message.trim();
    if (!message) {
      setError('Le message de l alarme est obligatoire.');
      return;
    }

    try {
      setCreateLoading(true);
      setError(null);

      const createdAlarm = await createAlarm({
        rtuId: Number(manualAlarmForm.rtuId),
        routeId: Number(manualAlarmForm.routeId),
        severity: manualAlarmForm.severity,
        alarmType: manualAlarmForm.alarmType,
        message,
        location: manualAlarmForm.location.trim() || null,
        localizationKm: manualAlarmForm.localizationKm.trim() || null,
        owner: currentUser?.username || 'admin',
      });

      prependOrReplaceAlarm(createdAlarm);
      setLastRealtimeUpdateAt(new Date().toISOString());
      setManualAlarmForm(createEmptyManualAlarmForm());
      setCreateDialogOpen(false);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible de creer l'alarme manuellement."));
    } finally {
      setCreateLoading(false);
    }
  };

  const manualAlarmRoutes = useMemo(() => {
    if (!manualAlarmForm.rtuId) {
      return routes;
    }

    const selectedRtuId = Number(manualAlarmForm.rtuId);
    return routes.filter(
      (route) => route.sourceRtuId === selectedRtuId || route.destinationRtuId === selectedRtuId
    );
  }, [manualAlarmForm.rtuId, routes]);

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

  const getRouteLabel = (routeId?: number | null): string => {
    if (!routeId) {
      return 'N/D';
    }

    const route = routes.find((item) => item.id === routeId);
    return route ? route.routeName : `Route-${routeId}`;
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
            Alarmes et evenements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type, severite, statut, horodatage et localisation du defaut.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRealtimeUpdate(lastRealtimeUpdateAt)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddAlertOutlined />}
          sx={{ borderRadius: 2 }}
          disabled={loading}
          onClick={() => setCreateDialogOpen(true)}
        >
          Creer une alarme
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

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Ajouter une alarme</DialogTitle>
        <DialogContent>
          <Stack spacing={2.2} mt={1}>
            {currentUser && !isAdmin ? (
              <Alert severity="warning">Seul l'admin peut ajouter une alarme manuellement.</Alert>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="manual-alarm-type-label">Type</InputLabel>
                <Select
                  labelId="manual-alarm-type-label"
                  label="Type"
                  value={manualAlarmForm.alarmType}
                  onChange={(event) =>
                    setManualAlarmForm((current) => ({
                      ...current,
                      alarmType: event.target.value as BackendAlarm['alarmType'],
                    }))
                  }
                >
                  <MenuItem value="Fiber Cut">Fiber Cut</MenuItem>
                  <MenuItem value="High Loss">High Loss</MenuItem>
                  <MenuItem value="RTU Down">RTU Down</MenuItem>
                  <MenuItem value="Temperature">Temperature</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="manual-alarm-severity-label">Severite</InputLabel>
                <Select
                  labelId="manual-alarm-severity-label"
                  label="Severite"
                  value={manualAlarmForm.severity}
                  onChange={(event) =>
                    setManualAlarmForm((current) => ({
                      ...current,
                      severity: event.target.value as BackendAlarm['severity'],
                    }))
                  }
                >
                  <MenuItem value="critical">Critique</MenuItem>
                  <MenuItem value="major">Majeure</MenuItem>
                  <MenuItem value="minor">Mineure</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel id="manual-alarm-rtu-label">RTU</InputLabel>
                <Select
                  labelId="manual-alarm-rtu-label"
                  label="RTU"
                  value={manualAlarmForm.rtuId}
                  onChange={(event) => handleManualAlarmRtuChange(String(event.target.value))}
                >
                  {rtus.map((rtu) => (
                    <MenuItem key={rtu.id} value={String(rtu.id)}>
                      {rtu.name} - {rtu.locationAddress || 'Zone inconnue'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required disabled={!manualAlarmForm.rtuId}>
                <InputLabel id="manual-alarm-route-label">Route</InputLabel>
                <Select
                  labelId="manual-alarm-route-label"
                  label="Route"
                  value={manualAlarmForm.routeId}
                  onChange={(event) => handleManualAlarmRouteChange(String(event.target.value))}
                >
                  {manualAlarmRoutes.map((route) => (
                    <MenuItem key={route.id} value={String(route.id)}>
                      {route.routeName} - {route.source} / {route.destination}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Message"
              value={manualAlarmForm.message}
              onChange={(event) =>
                setManualAlarmForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              multiline
              minRows={3}
              required
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Localisation"
                value={manualAlarmForm.location}
                onChange={(event) =>
                  setManualAlarmForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="KM"
                placeholder="KM 12.50"
                value={manualAlarmForm.localizationKm}
                onChange={(event) =>
                  setManualAlarmForm((current) => ({
                    ...current,
                    localizationKm: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateManualAlarm}
            disabled={createLoading || Boolean(currentUser && !isAdmin)}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

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
                    <TableCell>Route</TableCell>
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
                        <TableCell>{getRouteLabel(alarm.routeId)}</TableCell>
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
