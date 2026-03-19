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
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: string;
  location: string;
}

interface RecentAlarmsTableProps {
  alarms: AlarmRow[];
}

const getSeverityColor = (severity: AlarmRow['severity']) => {
  switch (severity) {
    case 'critical':
      return '#FF3366';
    case 'major':
      return '#FF9800';
    case 'minor':
      return '#FFC107';
    default:
      return '#64b5f6';
  }
};

const getStatusChip = (status: AlarmRow['status']) => {
  const colors = {
    active: { bg: '#FF3366', label: 'ACTIVE' },
    acknowledged: { bg: '#2196F3', label: 'ACKNOWLEDGED' },
    resolved: { bg: '#4CAF50', label: 'RESOLVED' },
  };
  const config = colors[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{ backgroundColor: config.bg, color: 'white', fontWeight: 'bold' }}
    />
  );
};

const RecentAlarmsTable: React.FC<RecentAlarmsTableProps> = ({ alarms }) => {
  const navigate = useNavigate();
  const tableAlarms = useMemo(() => alarms, [alarms]);

  if (!tableAlarms || tableAlarms.length === 0) {
    return (
      <Box className="glass-card animate-fadeInUp" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Active critical alarms
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No alarm data available yet.
        </Typography>
      </Box>
    );
  }

  const criticalCount = tableAlarms.filter((alarm) => alarm.severity === 'critical').length;
  const majorCount = tableAlarms.filter((alarm) => alarm.severity === 'major').length;

  return (
    <Box className="glass-card animate-fadeInUp" sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} color="white">
          Active critical alarms
        </Typography>
        <Box display="flex" gap={1}>
          <Chip
            label={`${criticalCount} Critical`}
            size="small"
            sx={{ backgroundColor: '#FF3366', color: 'white', fontWeight: 'bold' }}
          />
          <Chip
            label={`${majorCount} Major`}
            size="small"
            sx={{ backgroundColor: '#FF9800', color: 'white', fontWeight: 'bold' }}
          />
        </Box>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>TYPE</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>RTU</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>ZONE</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>SEVERITY</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>STATUS</TableCell>
              <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>LOCATION</TableCell>
              <TableCell
                align="center"
                sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', minWidth: 90 }}
              >
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableAlarms.map((alarm) => (
              <TableRow
                key={alarm.id}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/alarms/${alarm.id}`)}
              >
                <TableCell sx={{ color: 'white', fontFamily: 'monospace' }}>{alarm.id}</TableCell>
                <TableCell sx={{ color: 'white' }}>{alarm.type}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{alarm.rtu}</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{alarm.zone}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '999px',
                        backgroundColor: getSeverityColor(alarm.severity),
                      }}
                    />
                    <Typography variant="caption" sx={{ color: getSeverityColor(alarm.severity), fontWeight: 'bold' }}>
                      {alarm.severity.toUpperCase()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{getStatusChip(alarm.status)}</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{alarm.location}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    sx={{ color: '#00D9FF' }}
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

      <Box mt={2} textAlign="center">
        <Typography
          variant="caption"
          sx={{ color: '#00D9FF', cursor: 'pointer' }}
          onClick={() => navigate('/alarms')}
        >
          View all alarms &gt;
        </Typography>
      </Box>
    </Box>
  );
};

export default RecentAlarmsTable;
