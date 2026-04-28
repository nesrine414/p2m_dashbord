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
  if (!value) return 'N/D';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatNumber = (value?: number | null, suffix = ''): string => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/D';
  return `${value.toFixed(1)}${suffix}`;
};

const RtuTelemetryPanel: React.FC<RtuTelemetryPanelProps> = ({ bundle, loading = false, error, onRefresh }) => {
  if (loading) {
    return (
      <Paper className="card-premium-light" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700}>Chargement du bundle de télémesure...</Typography>
      </Paper>
    );
  }

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  if (!bundle) return <Alert severity="info" sx={{ borderRadius: 2 }}>Sélectionnez une RTU pour voir les détails.</Alert>;

  const openAlarms = bundle.alarms.filter((alarm) => !isClosedAlarmLifecycle(alarm.lifecycleStatus));

  return (
    <Stack spacing={2.5}>
      <Paper className="card-premium-light" sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{bundle.rtu.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {bundle.rtu.locationAddress || 'Localisation inconnue'} • {bundle.ipAddress}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip label={`Source: ${bundle.source}`} variant="outlined" />
            <Chip label={`Score: ${bundle.summary.healthScore}`} color="primary" />
            <Chip label={`${openAlarms.length} Alarme(s)`} color={openAlarms.length > 0 ? 'error' : 'success'} />
            {onRefresh && (
              <Button size="small" variant="contained" startIcon={<RefreshOutlinedIcon />} onClick={onRefresh}>
                Actualiser
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>STATUT RTU</Typography>
              <Box mt={1}><StatusBadge status={bundle.rtu.status} /></Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>ALIMENTATION</Typography>
              <Box mt={1}><StatusBadge status={bundle.rtu.power || 'normal'} /></Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>UNITÉ OTDR</Typography>
              <Box mt={1}><StatusBadge status={bundle.rtu.otdrStatus || 'fault'} /></Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>SCORE SANTÉ</Typography>
              <Typography variant="h4" fontWeight={800} mt={0.5}>{bundle.summary.healthScore}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={2} mt={1}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>MTTR MOYEN</Typography>
              <Typography variant="h4" fontWeight={800}>{formatNumber(bundle.kpis.mttrHours, ' h')}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>MTBF ESTIMÉ</Typography>
              <Typography variant="h4" fontWeight={800}>{formatNumber(bundle.kpis.mtbfHours, ' h')}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>DISPONIBILITÉ</Typography>
              <Typography variant="h4" color="success.main" fontWeight={800}>{formatNumber(bundle.kpis.availabilityPercent, '%')}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper className="card-premium-light" sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #dee2e6' }}>
            <Typography variant="h6" fontWeight={700}>Fibres Connectées</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ROUTE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>FIBRE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ATTÉNUATION</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DERNIER TEST</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bundle.fibres.map((fibre) => (
                <TableRow key={fibre.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{fibre.routeName}</Typography>
                    <Typography variant="caption" color="text.secondary">{fibre.source} &rarr; {fibre.destination}</Typography>
                  </TableCell>
                  <TableCell><StatusBadge status={fibre.fiberStatus} /></TableCell>
                  <TableCell>{formatNumber(fibre.attenuationDb, ' dB')}</TableCell>
                  <TableCell>{formatDateTime(fibre.lastTestTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
};

export default RtuTelemetryPanel;
