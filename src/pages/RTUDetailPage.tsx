import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography, Breadcrumbs, Link, Paper } from '@mui/material';
import { ArrowBackOutlined, Home, SettingsRemote } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import RtuTelemetryPanel from '../components/widgets/RtuTelemetryPanel';
import DiagnosticTestPanel from '../components/widgets/DiagnosticTestPanel';
import { ROUTE_PATHS } from '../constants/routes';
import { getRTUById, getRTUByIp, getTelemetryBundleByIp, BackendRTU } from '../services/api';
import { SupervisionTelemetryBundle } from '../types/liveSupervision';
import { useLiveSupervision } from '../hooks/useLiveSupervision';

const isNumericId = (value: string): boolean => /^\d+$/.test(value);

const RTUDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const rtuParam = params.id || '';
  const { revision, connected } = useLiveSupervision();
  const [rtu, setRtu] = useState<BackendRTU | null>(null);
  const [bundle, setBundle] = useState<SupervisionTelemetryBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const displayTitle = useMemo(() => rtu?.name || `RTU ${rtuParam}`, [rtu?.name, rtuParam]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const lookupKey = decodeURIComponent(rtuParam);
        let resolvedRtu: BackendRTU | null = null;

        if (isNumericId(lookupKey)) {
          try { resolvedRtu = await getRTUById(Number(lookupKey)); } catch { resolvedRtu = null; }
        }
        if (!resolvedRtu) {
          try { resolvedRtu = await getRTUByIp(lookupKey); } catch { resolvedRtu = null; }
        }

        if (!active) return;
        if (!resolvedRtu?.ipAddress) {
          setError("RTU introuvable.");
          return;
        }

        setRtu(resolvedRtu);
        const telemetryBundle = await getTelemetryBundleByIp(resolvedRtu.ipAddress);
        if (active) setBundle(telemetryBundle);
      } catch {
        if (active) setError('Erreur de télémesure RTU.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [rtuParam, refreshIndex, revision]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5}>Détails Équipement</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href={ROUTE_PATHS.rtu}>
                <SettingsRemote sx={{ mr: 0.5 }} fontSize="inherit" /> Inventaire
              </Link>
              <Typography color="text.primary">{displayTitle}</Typography>
            </Breadcrumbs>
        </Box>
        <Stack direction="row" spacing={1}>
            <Chip 
              label={connected ? 'Live Sync' : 'Offline'} 
              color={connected ? 'success' : 'default'} 
              size="small" 
            />
            <Button variant="outlined" size="small" startIcon={<ArrowBackOutlined />} onClick={() => navigate(ROUTE_PATHS.rtu)}>Retour</Button>
        </Stack>
      </Box>

      {loading && <CircularProgress size={20} sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!error && bundle && (
        <Paper className="card-premium-light" sx={{ p: 2, mb: 3, bgcolor: '#e7f3ff', border: 'none' }}>
            <Typography variant="body1" fontWeight={700}>
                Connecté à {displayTitle} — <span style={{ opacity: 0.7 }}>IP: {bundle.ipAddress}</span>
            </Typography>
        </Paper>
      )}

      <Stack spacing={3}>
        <RtuTelemetryPanel bundle={bundle} loading={loading} error={error} onRefresh={() => setRefreshIndex(v => v+1)} />
        <DiagnosticTestPanel ipAddress={rtu?.ipAddress} />
      </Stack>
    </Box>
  );
};

export default RTUDetailPage;
