import React, { useMemo, useState } from 'react';
import { Box, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { Psychology } from '@mui/icons-material';

interface Prediction {
  id: number;
  rtuId: number;
  rtuName: string;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  features: {
    attenuationDb: number;
    nbAlarms24h: number;
    uptimePercent: number;
  };
}

const getRiskColor = (level: Prediction['riskLevel']) => {
  switch (level) {
    case 'critical':
      return '#FF3366';
    case 'high':
      return '#FF9800';
    case 'medium':
      return '#FFB800';
    default:
      return '#00FF88';
  }
};

const DashboardIAPage: React.FC = () => {
  const [globalScore] = useState(85);
  const [predictions] = useState<Prediction[]>([
    {
      id: 1,
      rtuId: 23,
      rtuName: 'RTU-Tunisia-001',
      probability: 0.78,
      riskLevel: 'high',
      features: { attenuationDb: 15.3, nbAlarms24h: 2, uptimePercent: 96.5 },
    },
    {
      id: 2,
      rtuId: 45,
      rtuName: 'RTU-Tunisia-002',
      probability: 0.65,
      riskLevel: 'medium',
      features: { attenuationDb: 13.8, nbAlarms24h: 1, uptimePercent: 98.2 },
    },
    {
      id: 3,
      rtuId: 12,
      rtuName: 'RTU-Tunisia-003',
      probability: 0.82,
      riskLevel: 'high',
      features: { attenuationDb: 16.7, nbAlarms24h: 3, uptimePercent: 94.1 },
    },
  ]);

  const topPredictions = useMemo(() => predictions.slice(0, 5), [predictions]);

  return (
    <Box>
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Psychology sx={{ fontSize: 40, color: '#9C27B0' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              Artificial Intelligence Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Failure predictions and predictive network analysis
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box className="glass-card" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Overall network health score
            </Typography>

            <Box
              sx={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: `conic-gradient(#00FF88 ${globalScore}%, rgba(255,255,255,0.1) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '20px auto',
              }}
            >
              <Box
                sx={{
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  backgroundColor: '#0A0E27',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h2" fontWeight="bold" color="#00FF88">
                  {globalScore}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  /100
                </Typography>
              </Box>
            </Box>

            <Chip
              label="Healthy (>80)"
              sx={{ backgroundColor: '#00FF88', color: 'black', fontWeight: 'bold', width: '100%' }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Box className="glass-card" sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700} color="white">
                Predictive alerts
              </Typography>
              <Chip
                label={`${predictions.length} RTUs at risk`}
                sx={{ backgroundColor: '#FF3366', color: 'white', fontWeight: 'bold' }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {predictions.map((pred) => (
                <Box
                  key={pred.id}
                  className="glass-card"
                  sx={{
                    p: 2,
                    borderLeft: `4px solid ${getRiskColor(pred.riskLevel)}`,
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="white">
                        {pred.rtuName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        Failure risk within 48h
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="h5" fontWeight="bold" sx={{ color: getRiskColor(pred.riskLevel) }}>
                        {Math.round(pred.probability * 100)}%
                      </Typography>
                      <Chip
                        label={pred.riskLevel.toUpperCase()}
                        size="small"
                        sx={{
                          mt: 0.5,
                          backgroundColor: getRiskColor(pred.riskLevel),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>
                  </Box>

                  <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={`Attenuation: ${pred.features.attenuationDb} dB`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <Chip
                      label={`Alarms (24h): ${pred.features.nbAlarms24h}`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <Chip
                      label={`Uptime: ${pred.features.uptimePercent}%`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Box className="glass-card" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Top 5 critical RTUs
            </Typography>

            {topPredictions.map((pred, index) => (
              <Box key={pred.id} mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="white">
                    {index + 1}. {pred.rtuName}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold" color="white">
                    {Math.round(pred.probability * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pred.probability * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getRiskColor(pred.riskLevel),
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardIAPage;
