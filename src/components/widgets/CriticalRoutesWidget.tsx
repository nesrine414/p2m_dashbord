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

const getStatusColor = (status: CriticalRoute['status']) => (status === 'broken' ? '#dc3545' : '#ffc107');

const getStatusLabel = (status: CriticalRoute['status']) => (status === 'broken' ? 'COUPÉE' : 'DÉGRADÉE');

const CriticalRoutesWidget: React.FC<CriticalRoutesWidgetProps> = ({ routes }) => {
  const contentBox = (children: React.ReactNode) => (
    <Box 
      className="card-premium-light animate-fadeIn" 
      sx={{ 
        p: 2.5,
        backgroundColor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </Box>
  );

  if (!routes || routes.length === 0) {
    return contentBox(
      <>
        <Typography variant="h6" fontWeight={700} mb={1.5}>
          Routes fibre critiques
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune route critique détectée actuellement.
        </Typography>
      </>
    );
  }

  return contentBox(
    <>
      <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', mb: 2 }}>
        Topologie & Alertes Routes
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
        {routes.map((route) => (
          <Box
            key={route.id}
            sx={{
              p: 1.8,
              borderRadius: 1,
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderLeft: `4px solid ${getStatusColor(route.status)}`,
              position: 'relative',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {route.name}
              </Typography>
              <Chip
                label={getStatusLabel(route.status)}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor(route.status)}15`,
                  color: getStatusColor(route.status),
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  border: `1px solid ${getStatusColor(route.status)}55`
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {route.from} ↔ {route.to}
            </Typography>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Atténuation: <span style={{ color: '#343a40', fontWeight: 700 }}>{route.attenuation}</span>
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Testé il y a: <span style={{ color: '#6c757d' }}>{route.lastTest}</span>
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
};

export default CriticalRoutesWidget;