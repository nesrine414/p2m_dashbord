import React from 'react';
import { Box, Typography, Stack, Grid, Chip } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import { PulseStatusIcon } from '../common';

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
    (r) => r.status === 'offline' || r.status === 'unreachable' || r.temperature > 45
  );

  const contentBox = (children: React.ReactNode) => (
    <Box 
      className="card-premium-light animate-fadeIn" 
      sx={{ 
        p: 2.5,
        backgroundColor: 'background.paper',
        width: '100%'
      }}
    >
      {children}
    </Box>
  );

  if (criticalRtus.length === 0) {
    return contentBox(
      <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" py={1}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PulseStatusIcon status="online" size={10} />
        </Box>
        <Typography variant="body1" fontWeight={600} color="text.primary">
          Toutes les unités RTU sont opérationnelles
        </Typography>
      </Stack>
    );
  }

  return contentBox(
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          État du Matériel RTU
        </Typography>
        <Chip 
          label={`${criticalRtus.length} Alerte(s)`} 
          color="error" 
          size="small" 
          sx={{ fontWeight: 800, px: 1 }} 
        />
      </Stack>

      <Grid container spacing={2}>
        {criticalRtus.map((rtu) => {
          const isOverheating = rtu.temperature > 45;
          const isOffline = rtu.status === 'offline' || rtu.status === 'unreachable';

          return (
            <Grid key={rtu.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: isOffline ? '#dc3545' : '#ffc107',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {rtu.name}
                    </Typography>
                    <PulseStatusIcon status={isOffline ? 'offline' : 'online'} size={8} />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                    {rtu.location}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {isOffline && (
                      <Chip
                        icon={<ErrorOutlineIcon style={{ fontSize: 13 }} />}
                        label={rtu.status === 'offline' ? 'HORS LIGNE' : 'INJOIGNABLE'}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(220, 53, 69, 0.1)', 
                          color: '#dc3545', 
                          fontWeight: 700,
                          fontSize: '0.65rem'
                        }}
                      />
                    )}
                    {isOverheating && (
                      <Chip
                        icon={<ThermostatIcon style={{ fontSize: 13 }} />}
                        label={`${rtu.temperature}°C`}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255, 193, 7, 0.1)', 
                          color: '#856404', 
                          fontWeight: 700,
                          fontSize: '0.65rem'
                        }}
                      />
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
};

export default HardwareAlertsWidget;
