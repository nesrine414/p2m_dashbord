import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

export interface CriticalRoute {
  id: number;
  name: string;
  from: string;
  to: string;
  status: 'degraded' | 'broken';
  attenuation: string;
  lastTest: string;
}

interface CriticalRoutesWidgetProps {
  routes: CriticalRoute[];
}

const getStatusColor = (status: CriticalRoute['status']) => (status === 'broken' ? '#FF3366' : '#FFB800');

const getStatusLabel = (status: CriticalRoute['status']) => (status === 'broken' ? 'Cassée' : 'Dégradée');

const CriticalRoutesWidget: React.FC<CriticalRoutesWidgetProps> = ({ routes }) => {
  if (!routes || routes.length === 0) {
    return (
      <Box className="glass-card animate-fadeInUp" sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Routes fibre critiques
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune route disponible pour le moment.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="glass-card animate-fadeInUp" sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
        Routes fibre critiques
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {routes.map((route) => (
          <Box
            key={route.id}
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${getStatusColor(route.status)}`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: getStatusColor(route.status),
              },
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="subtitle1" fontWeight={700} color="white">
                {route.name}
              </Typography>
              <Chip
                label={getStatusLabel(route.status)}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(route.status),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              {route.from} vers {route.to}
            </Typography>

            <Box display="flex" gap={2}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Atténuation: <span style={{ color: 'white', fontWeight: 'bold' }}>{route.attenuation}</span>
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Dernier test: <span style={{ color: 'white' }}>{route.lastTest}</span>
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CriticalRoutesWidget;