import React, { useMemo } from 'react';
import { Box, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import { Cancel, CheckCircle, Thermostat, Warning } from '@mui/icons-material';
import { rtuInventoryRecords } from '../../data/mockData';
import { OtdrAvailabilityStatus, RTUStatus } from '../../types';

export interface RTUCard {
  id: number;
  name: string;
  location: string;
  status: RTUStatus;
  temperature: number;
  availabilityPercent: number;
}

interface RTUCardsWidgetProps {
  rtus?: RTUCard[];
}

const availabilityFromStatus = (status: OtdrAvailabilityStatus, uptimePercent: number) => {
  if (uptimePercent > 0) {
    return Math.min(100, Math.max(0, uptimePercent));
  }
  switch (status) {
    case OtdrAvailabilityStatus.READY:
      return 99;
    case OtdrAvailabilityStatus.BUSY:
      return 72;
    case OtdrAvailabilityStatus.FAULT:
      return 12;
    default:
      return 0;
  }
};

const toFallbackRtus = (): RTUCard[] =>
  rtuInventoryRecords.slice(0, 5).map((rtu) => ({
    id: rtu.id,
    name: rtu.name,
    location: rtu.zone,
    status: rtu.status,
    temperature: rtu.temperature,
    availabilityPercent: availabilityFromStatus(rtu.otdrAvailability, rtu.uptimePercent),
  }));

const getStatusIcon = (status: RTUStatus) => {
  switch (status) {
    case RTUStatus.ONLINE:
      return <CheckCircle sx={{ color: '#00FF88', fontSize: 24 }} />;
    case RTUStatus.WARNING:
      return <Warning sx={{ color: '#FFB800', fontSize: 24 }} />;
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
  const rtuCards = useMemo(() => {
    if (rtus && rtus.length > 0) {
      return rtus;
    }
    return toFallbackRtus();
  }, [rtus]);

  const onlineCount = rtuCards.filter((rtu) => rtu.status === RTUStatus.ONLINE).length;

  return (
    <Box sx={{ mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} color="white">
          RTU / OTDR Status
        </Typography>
        <Chip
          label={`${onlineCount}/${rtuCards.length} Online`}
          sx={{ backgroundColor: '#00FF88', color: 'black', fontWeight: 'bold' }}
        />
      </Box>

      <Grid container spacing={2}>
        {rtuCards.map((rtu) => (
          <Grid key={rtu.id} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <Box
              className="glass-card"
              sx={{
                p: 2,
                height: '100%',
                border:
                  rtu.status === RTUStatus.OFFLINE || rtu.status === RTUStatus.UNREACHABLE
                    ? '2px solid #FF3366'
                    : 'none',
                boxShadow:
                  rtu.status === RTUStatus.OFFLINE || rtu.status === RTUStatus.UNREACHABLE
                    ? '0 0 0 1px rgba(255, 51, 102, 0.4), 0 18px 30px rgba(255, 51, 102, 0.18)'
                    : undefined,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold" color="white">
                  {rtu.name}
                </Typography>
                {getStatusIcon(rtu.status)}
              </Box>

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }} display="block" mb={2}>
                {rtu.location}
              </Typography>
              {(rtu.status === RTUStatus.OFFLINE || rtu.status === RTUStatus.UNREACHABLE) && (
                <Chip
                  label="OFFLINE"
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
                  Temperature
                </Typography>
              </Box>
              <Box display="flex" alignItems="baseline" gap={1}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: getTempColor(rtu.temperature) }}>
                {rtu.temperature}C
              </Typography>
                {rtu.temperature > 40 && (
                  <Chip label="CRITICAL" size="small" sx={{ backgroundColor: '#FF3366', color: 'white', fontSize: 9 }} />
                )}
              </Box>

              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    OTDR Availability
                  </Typography>
                  <Typography variant="caption" fontWeight="bold" color="white">
                    {rtu.availabilityPercent.toFixed(1)}%
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
                Location: {rtu.location}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RTUCardsWidget;
