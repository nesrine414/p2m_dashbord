import React from 'react';
import { Chip } from '@mui/material';
import { RTUStatus, AlarmSeverity } from '../../types';

interface StatusBadgeProps {
  status: RTUStatus | AlarmSeverity | string;
  variant?: 'filled' | 'outlined';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'filled' }) => {
  const getColor = (): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'normal':
        return 'success';
      case 'offline':
      case 'critical':
        return 'error';
      case 'warning':
      case 'major':
        return 'warning';
      case 'minor':
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getLabel = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Chip
      label={getLabel()}
      color={getColor()}
      variant={variant}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};

export default StatusBadge;