import React from 'react';
import { Chip } from '@mui/material';
import { AlarmSeverity, RTUStatus } from '../../types';

interface StatusBadgeProps {
  status: RTUStatus | AlarmSeverity | string;
  variant?: 'filled' | 'outlined';
  label?: string;
}

const getFrenchLabel = (value: string): string => {
  const labels: Record<string, string> = {
    online: 'En ligne',
    normal: 'Normal',
    connected: 'Connecte',
    ready: 'Pret',
    pass: 'Reussi',
    cleared: 'Cloture',
    resolved: 'Resolu',
    closed: 'Cloture',
    offline: 'Hors ligne',
    critical: 'Critique',
    broken: 'Coupee',
    failure: 'Panne',
    fault: 'Defaut',
    disconnected: 'Deconnecte',
    unreachable: 'Injoignable',
    fail: 'Echec',
    warning: 'Avertissement',
    major: 'Majeur',
    degraded: 'Degrade',
    aging: 'Vieillissement',
    busy: 'Occupe',
    active: 'Actif',
    in_progress: 'En cours',
    inactive: 'Inactif',
    minor: 'Mineur',
    info: 'Info',
    acknowledged: 'Pris en compte',
    scheduled: 'Planifie',
  };

  return (
    labels[value.toLowerCase()] ||
    value
      .split(/[_-\s]+/)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(' ')
  );
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'filled', label }) => {
  const normalizedStatus = String(status).toLowerCase();

  const getColor = (): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (normalizedStatus) {
      case 'online':
      case 'normal':
      case 'connected':
      case 'ready':
      case 'pass':
      case 'cleared':
      case 'resolved':
      case 'closed':
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
      case 'aging':
      case 'busy':
      case 'active':
      case 'in_progress':
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
      label={label || getFrenchLabel(String(status))}
      color={getColor()}
      variant={variant}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};

export default StatusBadge;
