import React from 'react';
import { Box, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { Cancel, CheckCircle, Thermostat } from '@mui/icons-material';
import { RTUStatus } from '../../types';
import { normalizeRtuStatus } from '../../utils/rtuStatus';

export interface RTUCard {
  id: number;
  name: string;
  location: string;
  status: RTUStatus;
  temperature: number;
  availabilityPercent: number;
}

interface RTUCardsWidgetProps {
  rtus: RTUCard[];
}

const getStatusIcon = (status: RTUStatus) => {
  switch (status) {
    case RTUStatus.ONLINE:
      return <CheckCircle sx={{ color: '#00FF88', fontSize: 24 }} />;
    default:
      return <Cancel sx={{ color: '#FF3366', fontSize: 24 }} />;
  }
};

const getTempColor = (temp: number) => {
  if (temp > 40) return '#FF3366';
  if (temp > 30) return '#FFB800';
  return '#00FF88';
};

const RTUCardsWidget: React.FC<RTUCardsWidgetProps> = ({ rtus }) => {
  if (!rtus || rtus.length === 0) {
    return (
      <Box className="glass-card" sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Statut RTU / OTDR
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée RTU disponible pour le moment.
        </Typography>
      </Box>
    );
  }

  const onlineCount = rtus.filter((rtu) => normalizeRtuStatus(rtu.status) === RTUStatus.ONLINE).length;

  return (
    <Box sx={{ mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} color="white">
          Statut RTU / OTDR
        </Typography>
        <Chip
          label={`${onlineCount}/${rtus.length} En ligne`}
          sx={{ backgroundColor: '#00FF88', color: 'black', fontWeight: 'bold' }}
        />
      </Box>

      <Grid container spacing={2}>
        {rtus.map((rtu) => (
          <Grid key={rtu.id} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <Box
              className="glass-card"
              sx={{
                p: 2,
                height: '100%',
                border:
                  normalizeRtuStatus(rtu.status) === RTUStatus.ONLINE
                    ? 'none'
                    : '2px solid #FF3366',
                boxShadow:
                  normalizeRtuStatus(rtu.status) === RTUStatus.ONLINE
                    ? undefined
                    : '0 0 0 1px rgba(255, 51, 102, 0.4), 0 18px 30px rgba(255, 51, 102, 0.18)',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold" color="white">
                  {rtu.name}
                </Typography>
                {getStatusIcon(normalizeRtuStatus(rtu.status))}
              </Box>

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }} display="block" mb={2}>
                {rtu.location}
              </Typography>
              {normalizeRtuStatus(rtu.status) !== RTUStatus.ONLINE && (
                <Chip
                  label={
                    normalizeRtuStatus(rtu.status) === RTUStatus.UNREACHABLE ? 'INJOIGNABLE' : 'HORS LIGNE'
                  }
                  size="small"
                  sx={{
                    backgroundColor: '#FF3366',
                    color: 'white',
                    fontWeight: 'bold',
                    width: '100%',
                    mb: 2,
                  }}
                />
              )}

              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Thermostat sx={{ fontSize: 20, color: getTempColor(rtu.temperature) }} />
                <Typography variant="body2" color="white">
                  Température
                </Typography>
              </Box>
              <Box display="flex" alignItems="baseline" gap={1}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: getTempColor(rtu.temperature) }}>
                  {rtu.temperature}C
                </Typography>
                {rtu.temperature > 40 && (
                  <Chip label="CRITIQUE" size="small" sx={{ backgroundColor: '#FF3366', color: 'white', fontSize: 9 }} />
                )}
              </Box>

              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Disponibilité OTDR
                  </Typography>
                  <Typography variant="caption" fontWeight="bold" color="white">
                    {typeof rtu.availabilityPercent === 'number' && !isNaN(rtu.availabilityPercent) ? rtu.availabilityPercent.toFixed(1) : 'N/D'}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={rtu.availabilityPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        rtu.availabilityPercent > 90 ? '#00FF88' : rtu.availabilityPercent > 70 ? '#FFB800' : '#FF3366',
                    },
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2, display: 'block' }}>
                Localisation: {rtu.location}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RTUCardsWidget;
