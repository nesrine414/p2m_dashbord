import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { NotificationsActiveOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import { AlarmSeverity } from '../types';
import { alarmRecords, alarmZoneVolumes } from '../data/mockData';

const AlarmsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<'all' | AlarmSeverity>('all');

  const filteredAlarms = useMemo(
    () =>
      alarmRecords.filter((alarm) => {
        if (severityFilter === 'all') {
          return true;
        }
        return alarm.severity === severityFilter;
      }),
    [severityFilter]
  );

  const summary = useMemo(
    () => ({
      critical: alarmRecords.filter((item) => item.severity === AlarmSeverity.CRITICAL).length,
      major: alarmRecords.filter((item) => item.severity === AlarmSeverity.MAJOR).length,
      minor: alarmRecords.filter((item) => item.severity === AlarmSeverity.MINOR).length,
      info: alarmRecords.filter((item) => item.severity === AlarmSeverity.INFO).length,
      acknowledged: alarmRecords.filter((item) => item.acknowledged).length,
    }),
    []
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="white">
            Alarm Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Triaging active incidents and assigning next actions.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<NotificationsActiveOutlined />} sx={{ borderRadius: 2 }}>
          Create Incident Bridge
        </Button>
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#331f22', border: '1px solid #6c3742' }}>
            <Typography variant="caption" color="text.secondary">
              Critical
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ff8d9a">
              {summary.critical}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#312516', border: '1px solid #6a4a25' }}>
            <Typography variant="caption" color="text.secondary">
              Major
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#ffc47f">
              {summary.major}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#27301c', border: '1px solid #415736' }}>
            <Typography variant="caption" color="text.secondary">
              Minor
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#c3eca1">
              {summary.minor}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#232b35', border: '1px solid #374a63' }}>
            <Typography variant="caption" color="text.secondary">
              Info
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#9cc6ff">
              {summary.info}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, lg: 2.4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#1f2a2c', border: '1px solid #3d5d61' }}>
            <Typography variant="caption" color="text.secondary">
              Acknowledged
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#8ae8ef">
              {summary.acknowledged}/{alarmRecords.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} mb={2.4} flexWrap="wrap">
        <Chip
          clickable
          label="All"
          color={severityFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setSeverityFilter('all')}
        />
        <Chip
          clickable
          label="Critical"
          color={severityFilter === AlarmSeverity.CRITICAL ? 'error' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.CRITICAL)}
        />
        <Chip
          clickable
          label="Major"
          color={severityFilter === AlarmSeverity.MAJOR ? 'warning' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MAJOR)}
        />
        <Chip
          clickable
          label="Minor"
          color={severityFilter === AlarmSeverity.MINOR ? 'success' : 'default'}
          onClick={() => setSeverityFilter(AlarmSeverity.MINOR)}
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              Active Alarm Queue
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>RTU</TableCell>
                    <TableCell>Zone</TableCell>
                    <TableCell>Elapsed</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlarms.map((alarm) => (
                    <TableRow key={alarm.id} hover>
                      <TableCell>{alarm.id}</TableCell>
                      <TableCell>
                        <StatusBadge status={alarm.severity} />
                      </TableCell>
                      <TableCell>{alarm.category}</TableCell>
                      <TableCell sx={{ minWidth: 240 }}>{alarm.message}</TableCell>
                      <TableCell>{alarm.rtuName}</TableCell>
                      <TableCell>{alarm.zone}</TableCell>
                      <TableCell>{alarm.elapsed}</TableCell>
                      <TableCell>{alarm.owner}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined">
                            Ack
                          </Button>
                          <Button size="small" variant="contained">
                            Resolve
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
              <Typography variant="h6" color="white" mb={2}>
                Zone Distribution
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alarmZoneVolumes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                    <XAxis dataKey="zone" stroke="#9aa9bd" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9aa9bd" />
                    <Tooltip />
                    <Bar dataKey="critical" stackId="a" fill="#f44336" />
                    <Bar dataKey="major" stackId="a" fill="#ff9800" />
                    <Bar dataKey="minor" stackId="a" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
              <Typography variant="h6" color="white" mb={1.4}>
                Response Playbook
              </Typography>
              <Stack spacing={1.2}>
                <Typography variant="body2" color="text.secondary">
                  1. Confirm physical continuity from the nearest splitter.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2. Validate power rail and fan status from the RTU shell.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Trigger OTDR sweep and attach waveform in the incident.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Escalate to field team if critical alarm exceeds 20 minutes.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlarmsPage;
