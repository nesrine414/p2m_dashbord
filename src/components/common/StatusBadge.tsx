import React from 'react';
import { Chip } from '@mui/material';
import { RTUStatus, AlarmSeverity } from '../../types';

interface StatusBadgeProps {
  status: RTUStatus | AlarmSeverity | string;
  variant?: 'filled' | 'outlined';
}

const getFrenchLabel = (value: string): string => {
  const labels: Record<string, string> = {
    online: 'En ligne',
    normal: 'Normal',
    connected: 'Connecté',
    ready: 'Prêt',
    pass: 'Réussi',
    cleared: 'Clôturé',
    offline: 'Hors ligne',
    critical: 'Critique',
    broken: 'Cassé',
    failure: 'Panne',
    fault: 'Défaut',
    disconnected: 'Déconnecté',
    unreachable: 'Injoignable',
    fail: 'Échec',
    warning: 'Avertissement',
    major: 'Majeur',
    degraded: 'Dégradé',
    busy: 'Occupé',
    active: 'Actif',
    inactive: 'Inactif',
    minor: 'Mineur',
    info: 'Info',
    acknowledged: 'Pris en compte',
    scheduled: 'Planifié',
  };

  return labels[value.toLowerCase()] || value
    .split(/[_-\s]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'filled' }) => {
  const getColor = (): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'normal':
      case 'connected':
      case 'ready':
      case 'pass':
      case 'cleared':
        return 'success';
      case 'offline':
      case 'critical':
      case 'broken':
      case 'failure':
      case 'fault':
      case 'disconnected':
      case 'unreachable':
      case 'fail':
        return 'error';
      case 'warning':
      case 'major':
      case 'degraded':
      case 'busy':
      case 'active':
      case 'inactive':
        return 'warning';
      case 'minor':
      case 'info':
      case 'acknowledged':
      case 'scheduled':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={getFrenchLabel(String(status))}
      color={getColor()}
      variant={variant}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};

export default StatusBadge;