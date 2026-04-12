import React from 'react';
import { Box, Typography, Stack, Grid, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import PulseStatusIcon from '../common/PulseStatusIcon';

export interface AlertRTU {
  id: number;
  name: string;
  status: 'offline' | 'unreachable' | 'online' | 'warning';
  temperature: number;
  location: string;
}

interface HardwareAlertsWidgetProps {
  rtus: AlertRTU[];
}

const HardwareAlertsWidget: React.FC<HardwareAlertsWidgetProps> = ({ rtus }) => {
  const criticalRtus = rtus.filter(
    (r) => r.status === 'offline' || r.status === 'unreachable' || r.temperature > 50
  );

  if (criticalRtus.length === 0) {
    return (
      <Box className="glass-card-premium animate-fadeIn" sx={{ p: 3, textAlign: 'center' }}>
        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 239, 125, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PulseStatusIcon status="online" size={12} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="white">
            Toutes les unités RTU sont opérationnelles
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="glass-card-premium animate-fadeIn" sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={800} color="white">
          Alertes Infrastructures RTU
        </Typography>
        <Chip 
          label={`${criticalRtus.length} Alerte(s)`} 
          color="error" 
          size="small" 
          sx={{ fontWeight: 'bold', animation: 'pulse 2s infinite' }} 
        />
      </Stack>

      <Grid container spacing={2}>
        {criticalRtus.map((rtu) => {
          const isOverheating = rtu.temperature > 50;
          const isOffline = rtu.status === 'offline' || rtu.status === 'unreachable';

          return (
            <Grid key={rtu.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: isOffline ? '#FF3366' : '#FFB800',
                  }
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700} color="white">
                      {rtu.name}
                    </Typography>
                    <PulseStatusIcon status={isOffline ? 'offline' : 'online'} size={10} />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    {rtu.location}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {isOffline && (
                      <Chip
                        icon={<ErrorOutlineIcon style={{ fontSize: 14 }} />}
                        label={rtu.status === 'offline' ? 'Hors Ligne' : 'Injoignable'}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 51, 102, 0.1)', color: '#FF3366', fontWeight: 600 }}
                      />
                    )}
                    {isOverheating && (
                      <Chip
                        icon={<ThermostatIcon style={{ fontSize: 14 }} />}
                        label={`Surchauffe ${rtu.temperature}°C`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255, 184, 0, 0.1)', color: '#FFB800', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default HardwareAlertsWidget;
