import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
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
          try {
            resolvedRtu = await getRTUById(Number(lookupKey));
          } catch {
            resolvedRtu = null;
          }
        }

        if (!resolvedRtu) {
          try {
            resolvedRtu = await getRTUByIp(lookupKey);
          } catch {
            resolvedRtu = null;
          }
        }

        if (!active) return;

        if (!resolvedRtu?.ipAddress) {
          setRtu(null);
          setBundle(null);
          setError("Impossible de retrouver la RTU demandée. Vérifiez l'identifiant ou l'adresse IP.");
          return;
        }

        setRtu(resolvedRtu);
        const telemetryBundle = await getTelemetryBundleByIp(resolvedRtu.ipAddress);

        if (!active) return;

        setBundle(telemetryBundle);
      } catch {
        if (!active) return;
        setError('Impossible de charger le bundle telemetry de cette RTU.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [rtuParam, refreshIndex, revision]);

  const handleRefresh = () => setRefreshIndex((v) => v + 1);

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="white">
            Détail RTU
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vue complète par IP — fibres, alarmes, KPI et diagnostic en direct.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            label={connected ? 'Socket connecté' : 'Socket hors ligne'}
            color={connected ? 'success' : 'default'}
            variant="outlined"
            size="small"
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackOutlinedIcon />}
            onClick={() => navigate(ROUTE_PATHS.rtu)}
          >
            Retour inventaire
          </Button>
        </Stack>
      </Stack>

      {/* ── Loading / Error / Success ───────────────────────────────────── */}
      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement du bundle RTU...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && bundle && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {displayTitle} — IP {bundle.ipAddress} — source {bundle.source}
        </Alert>
      )}

      {/* ── Telemetry Panel ─────────────────────────────────────────────── */}
      <RtuTelemetryPanel bundle={bundle} loading={loading} error={error} onRefresh={handleRefresh} />

      {/* ── Diagnostic Test Panel ───────────────────────────────────────── */}
      <Box mt={3}>
        <DiagnosticTestPanel ipAddress={rtu?.ipAddress} />
      </Box>
    </Box>
  );
};

export default RTUDetailPage;
