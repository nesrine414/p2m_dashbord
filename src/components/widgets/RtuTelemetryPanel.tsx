import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import StatusBadge from '../common/StatusBadge';
import { isClosedAlarmLifecycle, SupervisionTelemetryBundle } from '../../types/liveSupervision';

interface RtuTelemetryPanelProps {
  bundle: SupervisionTelemetryBundle | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const formatDateTime = (value?: string | Date | null): string => {
  if (!value) {
    return 'N/D';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatNumber = (value?: number | null, suffix = ''): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/D';
  }

  return `${value.toFixed(1)}${suffix}`;
};

const RtuTelemetryPanel: React.FC<RtuTelemetryPanelProps> = ({ bundle, loading = false, error, onRefresh }) => {
  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Chargement du telemetry bundle...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Recuperation des mesures, des alarmes et des KPI associes a la RTU.
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!bundle) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Selectionnez une RTU ou renseignez une IP pour afficher son bundle complet.
      </Alert>
    );
  }

  const openAlarms = bundle.alarms.filter((alarm) => !isClosedAlarmLifecycle(alarm.lifecycleStatus));

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} color="white">
              {bundle.rtu.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {bundle.rtu.locationAddress || 'Localisation inconnue'} • {bundle.ipAddress}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip label={`Source: ${bundle.source}`} color="info" variant="outlined" />
            <Chip label={`Health ${bundle.summary.healthScore}`} color="primary" />
            <Chip label={`Open alarms ${openAlarms.length}`} color={openAlarms.length > 0 ? 'error' : 'success'} />
            {onRefresh && (
              <Button variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={onRefresh}>
                Rafraichir
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                RTU Status
              </Typography>
              <Box mt={0.8}>
                <StatusBadge status={bundle.rtu.status} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.2}>
                Last seen: {formatDateTime(bundle.rtu.lastSeen)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                Power Supply
              </Typography>
              <Box mt={0.8}>
                <StatusBadge status={bundle.rtu.power || 'normal'} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.2}>
                Temperature: {formatNumber(bundle.rtu.temperature, ' C')}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                OTDR
              </Typography>
              <Box mt={0.8}>
                <StatusBadge status={bundle.rtu.otdrStatus || 'fault'} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.2}>
                Last test: {bundle.summary.latestTestTime ? formatDateTime(bundle.summary.latestTestTime) : 'N/D'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                Network health
              </Typography>
              <Typography variant="h4" color="white" fontWeight={800} mt={0.8}>
                {bundle.summary.healthScore}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.2}>
                {bundle.summary.brokenFibres} broken / {bundle.summary.degradedFibres} degraded fibres
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2} mt={0.2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                MTTR
              </Typography>
              <Typography variant="h4" color="white" fontWeight={800}>
                {formatNumber(bundle.kpis.mttrHours, ' h')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bundle.kpis.formulaNotes.mttr}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                MTBF
              </Typography>
              <Typography variant="h4" color="white" fontWeight={800}>
                {formatNumber(bundle.kpis.mtbfHours, ' h')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bundle.kpis.formulaNotes.mtbf}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">
                Availability
              </Typography>
              <Typography variant="h4" color="white" fontWeight={800}>
                {formatNumber(bundle.kpis.availabilityPercent, '%')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bundle.kpis.formulaNotes.availability}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Fibres reliees
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Route</TableCell>
                <TableCell>Etat fibre</TableCell>
                <TableCell>Etat route</TableCell>
                <TableCell>Longueur</TableCell>
                <TableCell>Attenuation</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Dernier test</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bundle.fibres.map((fibre) => (
                <TableRow key={fibre.id} hover>
                  <TableCell>
                    <Typography variant="body2" color="white" fontWeight={700}>
                      {fibre.routeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fibre.source} &rarr; {fibre.destination}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={fibre.fiberStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={fibre.routeStatus} variant="outlined" />
                  </TableCell>
                  <TableCell>{formatNumber(fibre.lengthKm, ' km')}</TableCell>
                  <TableCell>{formatNumber(fibre.attenuationDb, ' dB')}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <StatusBadge status={fibre.testResult} />
                      <Typography variant="caption" color="text.secondary">
                        {fibre.testMode} / {fibre.wavelengthNm} nm
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDateTime(fibre.lastTestTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Alarmes associees
            </Typography>
            <Stack spacing={1.2}>
              {bundle.alarms.length === 0 && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  Aucune alarme liee a cette RTU.
                </Alert>
              )}
              {bundle.alarms.map((alarm) => (
                <Box
                  key={alarm.id}
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.8}>
                    <Typography variant="body2" color="white" fontWeight={700}>
                      {alarm.alarmType}
                    </Typography>
                    <StatusBadge status={alarm.severity} />
                  </Stack>
                  <Typography variant="body2" color="white">
                    {alarm.message}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                    <StatusBadge status={alarm.lifecycleStatus} variant="outlined" />
                    <Chip size="small" label={formatDateTime(alarm.occurredAt)} variant="outlined" />
                    <Chip
                      size="small"
                      label={alarm.resolvedAt ? `Resolved ${formatDateTime(alarm.resolvedAt)}` : 'Open'}
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Formules et provenance
            </Typography>
            <Stack spacing={1.2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  MTTR
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.mttr}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  MTBF
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.mtbf}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Availability
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.availability}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Attenuation
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.attenuation}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  OTDR failures
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.otdrFailures}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Fibre status
                </Typography>
                <Typography variant="body2" color="white">
                  {bundle.kpis.formulaNotes.fibreStatus}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Generated at {formatDateTime(bundle.generatedAt)}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default RtuTelemetryPanel;
