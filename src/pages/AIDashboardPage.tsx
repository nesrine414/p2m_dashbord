import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { PsychologyOutlined, AutoGraphOutlined } from '@mui/icons-material';
import {
  aiPredictionRecords,
  aiRiskTrendSeries,
  featureImportanceSeries,
  globalHealthScore,
  modelMetrics,
} from '../data/mockData';
import { RiskLevel } from '../types';

const riskColor: Record<RiskLevel, 'success' | 'warning' | 'error' | 'default'> = {
  [RiskLevel.LOW]: 'success',
  [RiskLevel.MEDIUM]: 'warning',
  [RiskLevel.HIGH]: 'error',
  [RiskLevel.CRITICAL]: 'error',
};

const AIDashboardPage: React.FC = () => {
  const [temperatureDrift, setTemperatureDrift] = useState(20);
  const [alarmBurst, setAlarmBurst] = useState(30);
  const [attenuationDrift, setAttenuationDrift] = useState(25);

  const projectedRisk = useMemo(() => {
    const weighted = temperatureDrift * 0.2 + alarmBurst * 0.35 + attenuationDrift * 0.45;
    return Math.min(100, Math.max(0, Math.round(weighted)));
  }, [temperatureDrift, alarmBurst, attenuationDrift]);

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
            AI Prediction Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Failure risk forecasting with static model outputs.
          </Typography>
        </Box>
        <Chip icon={<PsychologyOutlined />} label={`Model ${modelMetrics.version}`} color="primary" />
      </Stack>

      <Paper
        sx={{
          p: 2.8,
          borderRadius: 3,
          background: 'linear-gradient(140deg, #223250 0%, #1b273d 50%, #182234 100%)',
          border: '1px solid #2f4569',
          mb: 3,
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h5" color="white" fontWeight={800}>
              Global Health Score: {globalHealthScore}/100
            </Typography>
            <Typography variant="body2" color="#aac7e5" mt={0.7}>
              Risk remains controlled, but Paris East and Bordeaux Hub require preventive intervention in the next 24 hours.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <LinearProgress
              variant="determinate"
              value={globalHealthScore}
              sx={{
                height: 12,
                borderRadius: 6,
                mt: { xs: 1, md: 0.8 },
                backgroundColor: '#132033',
              }}
            />
            <Typography variant="caption" color="#9dc0e7">
              Target threshold: 80+
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <AutoGraphOutlined sx={{ color: '#86c8ff' }} />
              <Typography variant="h6" color="white">
                Risk Index Trend
              </Typography>
            </Stack>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aiRiskTrendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                  <XAxis dataKey="day" stroke="#9aa9bd" />
                  <YAxis stroke="#9aa9bd" domain={[40, 70]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="riskIndex" stroke="#66c7ff" fill="#2b6f9b" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Model Metrics
            </Typography>
            <Stack spacing={1.4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Accuracy {(modelMetrics.accuracy * 100).toFixed(1)}%
                </Typography>
                <LinearProgress variant="determinate" value={modelMetrics.accuracy * 100} sx={{ mt: 0.5, height: 7, borderRadius: 4 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Precision {(modelMetrics.precision * 100).toFixed(1)}%
                </Typography>
                <LinearProgress variant="determinate" value={modelMetrics.precision * 100} sx={{ mt: 0.5, height: 7, borderRadius: 4 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Recall {(modelMetrics.recall * 100).toFixed(1)}%
                </Typography>
                <LinearProgress variant="determinate" value={modelMetrics.recall * 100} sx={{ mt: 0.5, height: 7, borderRadius: 4 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  F1 {(modelMetrics.f1 * 100).toFixed(1)}%
                </Typography>
                <LinearProgress variant="determinate" value={modelMetrics.f1 * 100} sx={{ mt: 0.5, height: 7, borderRadius: 4 }} />
              </Box>
              <Typography variant="caption" color="#8fb3d1" mt={1}>
                Last training: {modelMetrics.lastTraining}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              Feature Importance
            </Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportanceSeries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                  <XAxis type="number" stroke="#9aa9bd" />
                  <YAxis dataKey="feature" type="category" width={120} stroke="#9aa9bd" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="weight" fill="#61c3ff" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              What-If Risk Simulator
            </Typography>
            <Stack spacing={1.8}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Temperature drift
                </Typography>
                <Slider value={temperatureDrift} onChange={(_, value) => setTemperatureDrift(value as number)} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Alarm burst intensity
                </Typography>
                <Slider value={alarmBurst} onChange={(_, value) => setAlarmBurst(value as number)} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Attenuation drift
                </Typography>
                <Slider value={attenuationDrift} onChange={(_, value) => setAttenuationDrift(value as number)} />
              </Box>
              <Paper sx={{ p: 1.7, backgroundColor: '#1f2a3c', border: '1px solid #364b68' }}>
                <Typography variant="caption" color="text.secondary">
                  Projected failure probability
                </Typography>
                <Typography variant="h4" color="white" fontWeight={800}>
                  {projectedRisk}%
                </Typography>
              </Paper>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
        <Typography variant="h6" color="white" mb={2}>
          Predicted High-Risk RTUs
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>RTU</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Failure Probability</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Horizon</TableCell>
                <TableCell>Primary Driver</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aiPredictionRecords.map((prediction) => (
                <TableRow key={prediction.id} hover>
                  <TableCell>{prediction.rtuName}</TableCell>
                  <TableCell>{prediction.zone}</TableCell>
                  <TableCell>{Math.round(prediction.probability * 100)}%</TableCell>
                  <TableCell>
                    <Chip label={prediction.riskLevel} size="small" color={riskColor[prediction.riskLevel]} />
                  </TableCell>
                  <TableCell>{prediction.horizonHours}h</TableCell>
                  <TableCell>{prediction.primaryDriver}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AIDashboardPage;
