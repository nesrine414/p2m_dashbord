import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  Grid,
  InputLabel,
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
  if (status === 'critical') return '#dc3545';
  if (status === 'warning') return '#ffc107';
  return '#28a745';
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
    <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: '#e9ecef', overflow: 'visible', mt: 1 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${valuePercent}%`,
          borderRadius: 5,
          background: `linear-gradient(90deg, #17a2b8, ${statusColor(status)})`,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      <Tooltip title={`Seuil: ${threshold}`} arrow>
        <Box
          sx={{
            position: 'absolute',
            top: -3,
            left: `${thresholdPercent}%`,
            width: 2,
            height: 16,
            bgcolor: '#adb5bd',
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

interface DiagnosticTestPanelProps {
  ipAddress?: string | null;
}

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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Échec du test de diagnostic.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTestOption = TEST_TYPE_OPTIONS.find((o) => o.value === testType)!;

  return (
    <Paper className="card-premium-light" sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center' }}>
        <ScienceIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={700}>Outil de Diagnostic Mobile / RTU</Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth size="small" label="Adresse IP de l'Equipement"
                value={ip} onChange={e => setIp(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><RouterIcon fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Select fullWidth size="small" value={testType} onChange={e => setTestType(e.target.value as any)}>
                {TEST_TYPE_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>

          <Box>
            <Button 
                size="small" startIcon={<TuneIcon />} variant="outlined" 
                onClick={() => setShowThresholds(!showThresholds)}
            >
                {showThresholds ? 'Masquer Options' : 'Configurer Seuils'}
            </Button>
            <Collapse in={showThresholds}>
                <Box sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #dee2e6' }}>
                    <Typography variant="caption" fontWeight={700} display="block" mb={2}>SEUILS CRITIQUES</Typography>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption">Atténuation Alerte ({thresholds.attenuationWarningDb} dB)</Typography>
                            <Slider size="small" value={thresholds.attenuationWarningDb} onChange={(_,v) => setThresholds({...thresholds, attenuationWarningDb: v as number})} min={5} max={25} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption">Température Alerte ({thresholds.temperatureWarningC}°C)</Typography>
                            <Slider size="small" value={thresholds.temperatureWarningC} onChange={(_,v) => setThresholds({...thresholds, temperatureWarningC: v as number})} min={20} max={60} />
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
          </Box>

          <Button 
            variant="contained" fullWidth size="large" onClick={handleRun} disabled={loading || !ip}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WifiTetheringIcon />}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            Lancer Analyse Temps Réel
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Box mt={2}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: result.verdict === 'alarm' ? '#fff5f5' : '#f6fff8', borderColor: result.verdict === 'alarm' ? '#feb2b2' : '#c6f6d5' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <StatusIcon status={result.verdict === 'alarm' ? 'critical' : 'pass'} size="large" />
                        <Box>
                            <Typography variant="h6" fontWeight={800} color={result.verdict === 'alarm' ? 'error.main' : 'success.main'}>
                                {result.verdict === 'alarm' ? 'ANOMALIE DÉTECTÉE' : 'ÉQUIPEMENT OPÉRATIONNEL'}
                            </Typography>
                            <Typography variant="body2">{result.rtuName} — Localisation vérifiée</Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Stack spacing={2} mt={3}>
                    {result.measurements.map((m: any, i: number) => (
                        <Box key={i} sx={{ p: 2, border: '1px solid #dee2e6', borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" fontWeight={700}>{m.parameter}</Typography>
                                <Typography variant="body2" fontWeight={800} color={statusColor(m.status)}>
                                    {m.value.toFixed(1)} {m.unit}
                                </Typography>
                            </Stack>
                            <MeterBar value={m.value} max={m.threshold * 2} threshold={m.threshold} status={m.status} />
                        </Box>
                    ))}
                </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};

export default DiagnosticTestPanel;
