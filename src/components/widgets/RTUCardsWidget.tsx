import React from 'react';
import { Box, Chip, Grid, LinearProgress, Paper, Typography, Stack } from '@mui/material';
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
      return <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />;
    default:
      return <Cancel sx={{ color: 'error.main', fontSize: 20 }} />;
  }
};

const getTempColor = (temp: number) => {
  if (temp > 40) return '#dc3545'; // error
  if (temp > 30) return '#ffc107'; // warning
  return '#28a745'; // success
};

const RTUCardsWidget: React.FC<RTUCardsWidgetProps> = ({ rtus }) => {
  if (!rtus || rtus.length === 0) {
    return (
      <Paper className="card-premium-light" sx={{ p: 3, borderTopColor: '#6c757d' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Unités RTU / OTDR
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée RTU disponible pour le moment.
        </Typography>
      </Paper>
    );
  }

  const onlineCount = rtus.filter((rtu) => normalizeRtuStatus(rtu.status) === RTUStatus.ONLINE).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: -0.5 }}>
          ÉTAT DISPOSITIFS RTU / OTDR
        </Typography>
        <Chip
          label={`${onlineCount}/${rtus.length} En ligne`}
          color="success"
          size="small"
          sx={{ fontWeight: 800, px: 1, borderRadius: '6px' }}
        />
      </Stack>

      <Grid container spacing={2}>
        {rtus.map((rtu) => {
          const status = normalizeRtuStatus(rtu.status);
          const isOnline = status === RTUStatus.ONLINE;
          
          return (
            <Grid key={rtu.id} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
              <Paper
                className="card-premium-light animate-fadeIn"
                sx={{
                  p: 2,
                  height: '100%',
                  borderTopColor: isOnline ? 'success.main' : 'error.main',
                  transition: 'transform 0.2s ease',
                  '&:hover': { transform: 'translateY(-4px)' }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="text.primary" lineHeight={1.2}>
                      {rtu.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rtu.location}
                    </Typography>
                  </Box>
                  {getStatusIcon(status)}
                </Stack>

                {!isOnline && (
                  <Chip
                    label={status === RTUStatus.UNREACHABLE ? 'INJOIGNABLE' : 'HORS LIGNE'}
                    size="small"
                    color="error"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                      width: '100%',
                      mb: 1.5,
                      borderRadius: '4px'
                    }}
                  />
                )}

                <Stack spacing={1.5} mt={isOnline ? 1 : 0}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Thermostat sx={{ fontSize: 16, color: getTempColor(rtu.temperature) }} />
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            Température: <Box component="span" sx={{ color: getTempColor(rtu.temperature) }}>{rtu.temperature}°C</Box>
                        </Typography>
                    </Stack>
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Disponibilité OTDR
                      </Typography>
                      <Typography variant="caption" fontWeight={800} color="primary.main">
                        {(rtu.availabilityPercent || 0).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={rtu.availabilityPercent}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#e9ecef',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor:
                            rtu.availabilityPercent > 90 ? '#28a745' : rtu.availabilityPercent > 70 ? '#ffc107' : '#dc3545',
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default RTUCardsWidget;
