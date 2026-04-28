import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export interface AlarmRow {
  id: number;
  type: string;
  rtu: string;
  zone: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved';
  timestamp: string;
  location: string;
}

interface RecentAlarmsTableProps {
  alarms: AlarmRow[];
}

const getSeverityColor = (severity: AlarmRow['severity']) => {
  switch (severity) {
    case 'critical':
      return '#dc3545';
    case 'major':
      return '#fd7e14';
    case 'minor':
      return '#ffc107';
    default:
      return '#17a2b8';
  }
};

const getSeverityLabel = (severity: AlarmRow['severity']) => {
  switch (severity) {
    case 'critical':
      return 'CRITIQUE';
    case 'major':
      return 'MAJEURE';
    case 'minor':
      return 'MINEURE';
    default:
      return 'INFO';
  }
};

const translateAlarmType = (type: string): string => {
  const translations: Record<string, string> = {
    'Fiber Cut': 'Coupure Fibre',
    'fiber cut': 'Coupure Fibre',
    'High Loss': 'Perte Élevée',
    'high loss': 'Perte Élevée',
    'RTU Down': 'RTU Hors Ligne',
    'Temperature': 'Température',
    'Maintenance': 'Maintenance',
    'Coupure Fibre': 'Coupure Fibre',
    'Perte Elevée': 'Perte Élevée',
    'Perte Élevée': 'Perte Élevée',
  };
  return translations[type] ?? type;
};

const getStatusChip = (status: AlarmRow['status']) => {
  const colors: Record<AlarmRow['status'], { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(220, 53, 69, 0.1)', color: '#dc3545', label: 'ACTIF' },
    acknowledged: { bg: 'rgba(0, 123, 255, 0.1)', color: '#007bff', label: 'RECU' },
    in_progress: { bg: 'rgba(253, 126, 20, 0.1)', color: '#fd7e14', label: 'EN COURS' },
    resolved: { bg: 'rgba(40, 167, 69, 0.1)', color: '#28a745', label: 'RESOLU' },
  };

  const config = colors[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{ 
        backgroundColor: config.bg, 
        color: config.color, 
        fontWeight: 700,
        fontSize: '0.65rem',
        border: `1px solid ${config.color}33`,
        borderRadius: 1
      }}
    />
  );
};

const RecentAlarmsTable: React.FC<RecentAlarmsTableProps> = ({ alarms }) => {
  const navigate = useNavigate();
  const tableAlarms = useMemo(() => alarms, [alarms]);

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

  if (!tableAlarms || tableAlarms.length === 0) {
    return contentBox(
      <>
        <Typography variant="h6" fontWeight={700} mb={1.5}>
          Alarmes critiques actives
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune alarme disponible pour le moment.
        </Typography>
      </>
    );
  }

  const criticalCount = tableAlarms.filter((alarm) => alarm.severity === 'critical').length;
  const majorCount = tableAlarms.filter((alarm) => alarm.severity === 'major').length;

  return contentBox(
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          Alertes récentes
        </Typography>
        <Box display="flex" gap={1}>
          {criticalCount > 0 && (
            <BadgeBadge count={criticalCount} label="Critiques" color="#dc3545" />
          )}
          {majorCount > 0 && (
            <BadgeBadge count={majorCount} label="Majeures" color="#fd7e14" />
          )}
        </Box>
      </Box>

      <TableContainer sx={{ flexGrow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>RTU</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>SÉVÉRITÉ</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>STATUT</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableAlarms.map((alarm) => (
              <TableRow
                key={alarm.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/alarms/${alarm.id}`)}
              >
                <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>
                  #{alarm.id}
                </TableCell>
                <TableCell>{translateAlarmType(alarm.type)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{alarm.rtu}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: getSeverityColor(alarm.severity),
                      }}
                    />
                    <Typography variant="caption" sx={{ color: getSeverityColor(alarm.severity), fontWeight: 700 }}>
                      {getSeverityLabel(alarm.severity)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{getStatusChip(alarm.status)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/alarms/${alarm.id}`);
                    }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2.5} pt={2} borderTop="1px solid #eee" textAlign="center">
        <Typography
          variant="caption"
          color="primary"
          fontWeight={600}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => navigate('/alarms')}
        >
          Voir tout le journal d'alarmes →
        </Typography>
      </Box>
    </>
  );
};

const BadgeBadge: React.FC<{ count: number; label: string; color: string }> = ({ count, label, color }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      bgcolor: `${color}15`, 
      color: color,
      borderRadius: 1,
      px: 1,
      py: 0.3,
      border: `1px solid ${color}33`
    }}
  >
    <Typography sx={{ fontSize: 11, fontWeight: 800 }}>{count}</Typography>
    <Typography sx={{ fontSize: 10, fontWeight: 600, ml: 0.5, textTransform: 'uppercase' }}>{label}</Typography>
  </Box>
);

export default RecentAlarmsTable;
