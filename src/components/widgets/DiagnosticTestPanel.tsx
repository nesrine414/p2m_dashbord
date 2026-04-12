import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScienceIcon from '@mui/icons-material/Science';
import TuneIcon from '@mui/icons-material/Tune';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BoltIcon from '@mui/icons-material/Bolt';
import RouterIcon from '@mui/icons-material/Router';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import {
  DiagnosticTestResult,
  DiagnosticTestType,
  DiagnosticThresholds,
  runDiagnosticTest,
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiagnosticTestPanelProps {
  ipAddress?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: DiagnosticThresholds = {
  attenuationWarningDb: 12,
  attenuationCriticalDb: 18,
  temperatureWarningC: 40,
  temperatureCriticalC: 45,
};

const TEST_TYPE_OPTIONS: { value: DiagnosticTestType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'otdr',
    label: 'Test OTDR',
    icon: <NetworkCheckIcon fontSize="small" />,
    desc: 'Mesure atténuation, événements de réflexion, résultat pass/fail',
  },
  {
    value: 'temperature',
    label: 'Température',
    icon: <ThermostatIcon fontSize="small" />,
    desc: 'Mesure température interne de la RTU vs seuils',
  },
  {
    value: 'full',
    label: 'Diagnostic Complet',
    icon: <BoltIcon fontSize="small" />,
    desc: 'OTDR + Température — analyse complète de la RTU',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor = (status: string) => {
  if (status === 'critical') return '#f08ba1';
  if (status === 'warning') return '#f1c07f';
  return '#84d8a3';
};

const statusBg = (status: string) => {
  if (status === 'critical') return 'rgba(240, 139, 161, 0.08)';
  if (status === 'warning') return 'rgba(241, 192, 127, 0.08)';
  return 'rgba(132, 216, 163, 0.08)';
};

const StatusIcon: React.FC<{ status: string; size?: 'small' | 'medium' | 'large' }> = ({ status, size = 'medium' }) => {
  const sx = { color: statusColor(status), fontSize: size === 'large' ? 48 : size === 'medium' ? 28 : 18 };
  if (status === 'critical') return <ErrorOutlineIcon sx={sx} />;
  if (status === 'warning') return <WarningAmberIcon sx={sx} />;
  return <CheckCircleOutlineIcon sx={sx} />;
};

const MeterBar: React.FC<{ value: number; max: number; threshold: number; status: string }> = ({
  value,
  max,
  threshold,
  status,
}) => {
  const valuePercent = Math.min((value / max) * 100, 100);
  const thresholdPercent = Math.min((threshold / max) * 100, 100);

  return (
    <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'visible', mt: 1 }}>
      {/* Value fill */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${valuePercent}%`,
          borderRadius: 5,
          background: `linear-gradient(90deg, rgba(106,217,255,0.7), ${statusColor(status)})`,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 10px ${statusColor(status)}66`,
        }}
      />
      {/* Threshold marker */}
      <Tooltip title={`Seuil: ${threshold}`} arrow>
        <Box
          sx={{
            position: 'absolute',
            top: -3,
            left: `${thresholdPercent}%`,
            width: 2,
            height: 16,
            bgcolor: 'rgba(255,255,255,0.5)',
            borderRadius: 1,
            transform: 'translateX(-50%)',
            cursor: 'help',
          }}
        />
      </Tooltip>
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DiagnosticTestPanel: React.FC<DiagnosticTestPanelProps> = ({ ipAddress }) => {
  const navigate = useNavigate();
  const [ip, setIp] = useState(ipAddress || '');
  const [testType, setTestType] = useState<DiagnosticTestType>('full');
  const [thresholds, setThresholds] = useState<DiagnosticThresholds>({ ...DEFAULT_THRESHOLDS });
  const [showThresholds, setShowThresholds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    if (!ip.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await runDiagnosticTest({ ipAddress: ip.trim(), testType, thresholds });
      setResult(res);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Impossible de contacter le serveur de test. Vérifiez la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(ip).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const selectedTestOption = TEST_TYPE_OPTIONS.find((o) => o.value === testType)!;

  return (
    <Paper
      sx={{
        p: 0,
        overflow: 'hidden',
        border: '1px solid rgba(106, 217, 255, 0.2)',
        background: 'linear-gradient(160deg, rgba(16, 24, 48, 0.95), rgba(20, 32, 60, 0.90))',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 60px rgba(5, 10, 22, 0.4), 0 0 0 1px rgba(106,217,255,0.08) inset',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          background: 'linear-gradient(90deg, rgba(106,217,255,0.12), rgba(126,165,232,0.08))',
          borderBottom: '1px solid rgba(106, 217, 255, 0.15)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(106,217,255,0.3), rgba(126,165,232,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(106,217,255,0.3)',
            }}
          >
            <ScienceIcon sx={{ color: '#6ad9ff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} color="white" fontSize="1rem">
              Diagnostic Test RTU
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Simulation de mesures NQMS — comparaison avec seuils configurables
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* ── Input Form ───────────────────────────────────────────────── */}
        <Stack spacing={2.5}>
          {/* IP + Test type row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                ADRESSE IP DE LA RTU
              </Typography>
              <TextField
                id="diagnostic-ip-input"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                placeholder="ex: 192.168.1.10"
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <RouterIcon sx={{ color: '#6ad9ff', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: ip ? (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copié !' : 'Copier IP'} arrow>
                        <IconButton size="small" onClick={handleCopyIp} sx={{ color: copied ? '#84d8a3' : 'text.secondary' }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                  sx: {
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    letterSpacing: 0.5,
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <Box minWidth={200}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                TYPE DE TEST
              </Typography>
              <Select
                id="diagnostic-test-type-select"
                value={testType}
                onChange={(e) => setTestType(e.target.value as DiagnosticTestType)}
                size="small"
                fullWidth
                sx={{ borderRadius: 2, fontSize: '0.875rem' }}
              >
                {TEST_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: '#6ad9ff', display: 'flex' }}>{opt.icon}</Box>
                      <span>{opt.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>

          {/* Test type description chip */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ color: '#6ad9ff', display: 'flex' }}>{selectedTestOption.icon}</Box>
            <Typography variant="caption" color="text.secondary">
              {selectedTestOption.desc}
            </Typography>
          </Stack>

          {/* Threshold toggle */}
          <Box>
            <Button
              size="small"
              startIcon={<TuneIcon />}
              onClick={() => setShowThresholds((v) => !v)}
              sx={{
                color: showThresholds ? '#6ad9ff' : 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                px: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: showThresholds ? 'rgba(106,217,255,0.35)' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.2s',
              }}
            >
              {showThresholds ? 'Masquer seuils' : 'Configurer seuils'}
            </Button>

            <Collapse in={showThresholds}>
              <Box
                sx={{
                  mt: 2,
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid rgba(106,217,255,0.12)',
                  background: 'rgba(106,217,255,0.04)',
                }}
              >
                <Typography variant="caption" color="#6ad9ff" fontWeight={700} mb={2} display="block">
                  SEUILS CONFIGURABLES
                </Typography>
                <Stack spacing={2.5}>
                  {/* Attenuation warning */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Atténuation — Avertissement
                      </Typography>
                      <Chip label={`${thresholds.attenuationWarningDb} dB`} size="small" sx={{ bgcolor: 'rgba(241,192,127,0.15)', color: '#f1c07f', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                    </Stack>
                    <Slider
                      id="threshold-attenuation-warning"
                      value={thresholds.attenuationWarningDb}
                      onChange={(_, v) => setThresholds((t) => ({ ...t, attenuationWarningDb: v as number }))}
                      min={5} max={25} step={0.5}
                      sx={{ color: '#f1c07f', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />
                  </Box>

                  {/* Attenuation critical */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Atténuation — Critique
                      </Typography>
                      <Chip label={`${thresholds.attenuationCriticalDb} dB`} size="small" sx={{ bgcolor: 'rgba(240,139,161,0.15)', color: '#f08ba1', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                    </Stack>
                    <Slider
                      id="threshold-attenuation-critical"
                      value={thresholds.attenuationCriticalDb}
                      onChange={(_, v) => setThresholds((t) => ({ ...t, attenuationCriticalDb: v as number }))}
                      min={10} max={40} step={0.5}
                      sx={{ color: '#f08ba1', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />
                  </Box>

                  {/* Temperature warning */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Température — Avertissement
                      </Typography>
                      <Chip label={`${thresholds.temperatureWarningC}°C`} size="small" sx={{ bgcolor: 'rgba(241,192,127,0.15)', color: '#f1c07f', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                    </Stack>
                    <Slider
                      id="threshold-temperature-warning"
                      value={thresholds.temperatureWarningC}
                      onChange={(_, v) => setThresholds((t) => ({ ...t, temperatureWarningC: v as number }))}
                      min={25} max={55} step={1}
                      sx={{ color: '#f1c07f', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />
                  </Box>

                  {/* Temperature critical */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Température — Critique
                      </Typography>
                      <Chip label={`${thresholds.temperatureCriticalC}°C`} size="small" sx={{ bgcolor: 'rgba(240,139,161,0.15)', color: '#f08ba1', fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                    </Stack>
                    <Slider
                      id="threshold-temperature-critical"
                      value={thresholds.temperatureCriticalC}
                      onChange={(_, v) => setThresholds((t) => ({ ...t, temperatureCriticalC: v as number }))}
                      min={30} max={70} step={1}
                      sx={{ color: '#f08ba1', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />
                  </Box>
                </Stack>

                <Button
                  size="small"
                  sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontSize: '0.75rem' }}
                  onClick={() => setThresholds({ ...DEFAULT_THRESHOLDS })}
                >
                  Réinitialiser
                </Button>
              </Box>
            </Collapse>
          </Box>

          {/* Run Button */}
          <Button
            id="diagnostic-run-btn"
            variant="contained"
            onClick={handleRun}
            disabled={loading || !ip.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <WifiTetheringIcon />}
            sx={{
              py: 1.4,
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: 2.5,
              background: 'linear-gradient(120deg, rgba(106,217,255,0.9), rgba(126,165,232,0.9))',
              color: '#0d1730',
              letterSpacing: 0.3,
              boxShadow: '0 8px 24px rgba(74, 136, 198, 0.3)',
              transition: 'all 0.25s',
              '&:hover': { boxShadow: '0 12px 32px rgba(106,217,255,0.4)', transform: 'translateY(-1px)' },
              '&:active': { transform: 'translateY(0)' },
              '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
            }}
          >
            {loading ? 'Test en cours...' : 'Lancer le Diagnostic'}
          </Button>
        </Stack>

        {/* ── Error state ───────────────────────────────────────────────── */}
        {error && (
          <Alert
            severity="error"
            icon={<ErrorOutlineIcon />}
            sx={{ mt: 2, borderRadius: 2, bgcolor: 'rgba(240,139,161,0.08)', border: '1px solid rgba(240,139,161,0.2)' }}
          >
            {error}
          </Alert>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {result && (
          <Box mt={3}>
            <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.07)' }} />

            {/* Overall verdict banner */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                border: `1px solid ${result.verdict === 'alarm' ? 'rgba(240,139,161,0.3)' : 'rgba(132,216,163,0.3)'}`,
                background: result.verdict === 'alarm'
                  ? 'linear-gradient(135deg, rgba(240,139,161,0.08), rgba(255,80,80,0.04))'
                  : 'linear-gradient(135deg, rgba(132,216,163,0.08), rgba(80,200,120,0.04))',
                mb: 3,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <StatusIcon status={result.verdict === 'alarm' ? 'critical' : 'pass'} size="large" />
                <Box flex={1}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: result.verdict === 'alarm' ? '#f08ba1' : '#84d8a3', letterSpacing: -0.5 }}
                  >
                    {result.verdict === 'alarm' ? '⚠ ALARME DÉTECTÉE' : '✓ DIAGNOSTIC : PASS'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.3}>
                    <strong style={{ color: 'white' }}>{result.rtuName}</strong>
                    {' '}— IP {result.ipAddress}
                    {result.fibreName && ` — Fibre: ${result.fibreName}`}
                    {result.fibreLengthKm != null && ` (${result.fibreLengthKm} km)`}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" mt={0.3} display="block">
                    Testé le {new Date(result.testedAt).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
                <Chip
                  label={selectedTestOption.label}
                  icon={<Box sx={{ display: 'flex', color: '#6ad9ff' }}>{selectedTestOption.icon}</Box>}
                  sx={{ bgcolor: 'rgba(106,217,255,0.1)', color: '#6ad9ff', fontWeight: 700, border: '1px solid rgba(106,217,255,0.2)' }}
                />
              </Stack>
            </Box>

            {/* Measurement rows */}
            <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1.5} display="block" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              Résultats des mesures
            </Typography>

            <Stack spacing={1.5} mb={3}>
              {result.measurements.map((m: any, idx: number) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${statusColor(m.status)}33`,
                    background: statusBg(m.status),
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <StatusIcon status={m.status} size="small" />
                    <Box flex={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="body2" fontWeight={600} color="white">
                          {m.parameter}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{ color: statusColor(m.status), fontVariantNumeric: 'tabular-nums' }}
                          >
                            {m.value.toFixed(1)} {m.unit}
                          </Typography>
                          <Chip
                            label={m.status === 'pass' ? 'PASS' : m.status === 'warning' ? 'AVERT.' : 'CRITIQUE'}
                            size="small"
                            sx={{
                              bgcolor: `${statusColor(m.status)}22`,
                              color: statusColor(m.status),
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              height: 20,
                              border: `1px solid ${statusColor(m.status)}44`,
                            }}
                          />
                        </Stack>
                      </Stack>
                      <MeterBar
                        value={m.value}
                        max={m.threshold * 2.2}
                        threshold={m.threshold}
                        status={m.status}
                      />
                      <Stack direction="row" justifyContent="space-between" mt={0.8}>
                        <Typography variant="caption" color="text.disabled">
                          {m.thresholdLabel}: <strong style={{ color: statusColor(m.status) }}>{m.threshold} {m.unit}</strong>
                        </Typography>
                        {m.alarmType && m.status !== 'pass' && (
                          <Typography variant="caption" color="text.disabled">
                            Type: <strong style={{ color: statusColor(m.status) }}>{m.alarmType}</strong>
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>

            {/* OTDR Parameters Table */}
            {result.otdr && (
              <Box mb={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1.5} display="block" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                  Paramètres OTDR
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Paramètre', 'Valeur', 'Statut'].map((h) => (
                          <TableCell key={h} sx={{ color: '#d4def2', fontWeight: 700, fontSize: '0.75rem', border: 'none', py: 1 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { param: 'Longueur d\'onde', value: `${result.otdr.wavelengthNm} nm`, status: 'pass' },
                        { param: 'Largeur d\'impulsion', value: result.otdr.pulseWidth, status: 'pass' },
                        { param: 'Plage dynamique', value: `${result.otdr.dynamicRangeDb} dB`, status: 'pass' },
                        { param: 'Mode de test', value: result.otdr.mode === 'manual' ? 'Manuel' : result.otdr.mode, status: 'pass' },
                        { param: 'Résultat OTDR', value: result.otdr.result.toUpperCase(), status: result.otdr.result === 'pass' ? 'pass' : 'critical' },
                      ].map((row, idx) => (
                        <TableRow
                          key={idx}
                          sx={{
                            '&:last-child td': { border: 0 },
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                          }}
                        >
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', py: 0.8, border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {row.param}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor(row.status), fontFamily: 'monospace', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {row.value}
                          </TableCell>
                          <TableCell sx={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', py: 0.8 }}>
                            <StatusIcon status={row.status} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Alarm created banner */}
            {result.alarmCreated && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(240,139,161,0.3)',
                  background: 'rgba(240,139,161,0.06)',
                  animation: 'pulseAlarm 2s ease-in-out infinite',
                  '@keyframes pulseAlarm': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(240,139,161,0)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(240,139,161,0.1)' },
                  },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <AlarmOnIcon sx={{ color: '#f08ba1', fontSize: 28 }} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={700} color="#f08ba1" mb={0.3}>
                      Alarme créée — ID #{result.alarmCreated.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.alarmCreated.message}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <Chip label={result.alarmCreated.alarmType} size="small" sx={{ bgcolor: 'rgba(240,139,161,0.12)', color: '#f08ba1', fontWeight: 700, height: 18, fontSize: '0.68rem' }} />
                      <Chip label={result.alarmCreated.severity.toUpperCase()} size="small" sx={{ bgcolor: 'rgba(240,80,80,0.12)', color: '#ff7070', fontWeight: 700, height: 18, fontSize: '0.68rem' }} />
                    </Stack>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(240,139,161,0.4)',
                      color: '#f08ba1',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      '&:hover': { borderColor: '#f08ba1', bgcolor: 'rgba(240,139,161,0.08)' },
                    }}
                    onClick={() => navigate(ROUTE_PATHS.alarms)}
                  >
                    Voir l'alarme
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Thresholds used summary */}
            <Box mt={2}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                Seuils utilisés — Att. avert.: {result.thresholds.attenuationWarningDb} dB · critique: {result.thresholds.attenuationCriticalDb} dB · Temp. avert.: {result.thresholds.temperatureWarningC}°C · critique: {result.thresholds.temperatureCriticalC}°C
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DiagnosticTestPanel;
