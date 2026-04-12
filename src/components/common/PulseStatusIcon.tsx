import React from 'react';
import { Box, Tooltip } from '@mui/material';

interface PulseStatusIconProps {
  status: 'online' | 'offline' | 'unreachable' | 'warning';
  size?: number;
}

const PulseStatusIcon: React.FC<PulseStatusIconProps> = ({ status, size = 10 }) => {
  const getColor = () => {
    switch (status) {
      case 'online': return '#38ef7d';
      case 'offline':
      case 'unreachable': return '#FF3366';
      case 'warning': return '#FFB800';
      default: return '#888';
    }
  };

  const color = getColor();

  return (
    <Tooltip title={`État: ${status}`} arrow>
      <Box 
        sx={{ 
          position: 'relative', 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: color,
            zIndex: 1,
          }}
        />
        {(status === 'offline' || status === 'unreachable' || status === 'warning') && (
          <Box
            sx={{
              position: 'absolute',
              width: '250%',
              height: '250%',
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.4,
              animation: 'pulse 1.5s infinite ease-out',
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};

export default PulseStatusIcon;
