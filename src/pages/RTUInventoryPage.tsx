import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DownloadOutlined, HubOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import { RTUStatus } from '../types';
import { rtuInventoryRecords } from '../data/mockData';

const PIE_COLORS = ['#4caf50', '#ff9800', '#f44336'];

const getTemperatureColor = (temperature: number): 'success' | 'warning' | 'error' => {
  if (temperature >= 40) {
    return 'error';
  }
  if (temperature >= 35) {
    return 'warning';
  }
  return 'success';
};

const RTUInventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | RTUStatus>('all');
  const [zone, setZone] = useState<'all' | string>('all');

  const zoneOptions = useMemo(
    () => ['all', ...Array.from(new Set(rtuInventoryRecords.map((item) => item.zone)))],
    []
  );

  const filteredRecords = useMemo(
    () =>
      rtuInventoryRecords.filter((record) => {
        const matchesSearch =
          record.name.toLowerCase().includes(search.toLowerCase()) ||
          record.ipAddress.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || record.status === status;
        const matchesZone = zone === 'all' || record.zone === zone;
        return matchesSearch && matchesStatus && matchesZone;
      }),
    [search, status, zone]
  );

  const summary = useMemo(() => {
    const online = rtuInventoryRecords.filter((item) => item.status === RTUStatus.ONLINE).length;
    const warning = rtuInventoryRecords.filter((item) => item.status === RTUStatus.WARNING).length;
    const offline = rtuInventoryRecords.filter((item) => item.status === RTUStatus.OFFLINE).length;
    const avgTemp =
      rtuInventoryRecords.reduce((acc, item) => acc + item.temperature, 0) / rtuInventoryRecords.length;

    return {
      total: rtuInventoryRecords.length,
      online,
      warning,
      offline,
      avgTemp: avgTemp.toFixed(1),
    };
  }, []);

  const statusDistribution = [
    { name: 'Online', value: summary.online },
    { name: 'Warning', value: summary.warning },
    { name: 'Offline', value: summary.offline },
  ];

  const handleStatusChange = (event: SelectChangeEvent<'all' | RTUStatus>) => {
    setStatus(event.target.value as 'all' | RTUStatus);
  };

  const handleZoneChange = (event: SelectChangeEvent<'all' | string>) => {
    setZone(event.target.value);
  };

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
            RTU Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Static operations snapshot for field and NOC teams.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadOutlined />} sx={{ borderRadius: 2 }}>
          Export Snapshot
        </Button>
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#1b2230', border: '1px solid #2c3748' }}>
            <Typography variant="caption" color="text.secondary">
              Total RTU
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white">
              {summary.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#17261e', border: '1px solid #2d4d3e' }}>
            <Typography variant="caption" color="text.secondary">
              Online
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#6ddf9e">
              {summary.online}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2b2318', border: '1px solid #5d4624' }}>
            <Typography variant="caption" color="text.secondary">
              Warning
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ffb96b">
              {summary.warning}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2c1d20', border: '1px solid #57323a' }}>
            <Typography variant="caption" color="text.secondary">
              Average Temperature
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white">
              {summary.avgTemp} C
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445', mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Search RTU or IP"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={handleStatusChange}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value={RTUStatus.ONLINE}>Online</MenuItem>
              <MenuItem value={RTUStatus.WARNING}>Warning</MenuItem>
              <MenuItem value={RTUStatus.OFFLINE}>Offline</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zone</InputLabel>
            <Select label="Zone" value={zone} onChange={handleZoneChange}>
              {zoneOptions.map((zoneOption) => (
                <MenuItem key={zoneOption} value={zoneOption}>
                  {zoneOption === 'all' ? 'All zones' : zoneOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              RTU Fleet
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>RTU</TableCell>
                    <TableCell>Zone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Temperature</TableCell>
                    <TableCell>Uptime</TableCell>
                    <TableCell>Optical Budget</TableCell>
                    <TableCell>Active Alarms</TableCell>
                    <TableCell>Last Seen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="white">
                          {record.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.ipAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.zone}</TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell sx={{ width: 160 }}>
                        <Typography variant="body2" color="white">
                          {record.temperature === 0 ? 'N/A' : `${record.temperature} C`}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(record.temperature * 2, 100)}
                          color={getTemperatureColor(record.temperature)}
                          sx={{ mt: 0.6, height: 6, borderRadius: 4 }}
                        />
                      </TableCell>
                      <TableCell>{record.uptimePercent.toFixed(1)}%</TableCell>
                      <TableCell>{record.opticalBudgetDb === 0 ? 'N/A' : `${record.opticalBudgetDb} dB`}</TableCell>
                      <TableCell>{record.activeAlarms}</TableCell>
                      <TableCell>{record.lastSeen}</TableCell>
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
                Fleet Status Mix
              </Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                      {statusDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <HubOutlined sx={{ color: '#7dc3ff' }} />
                <Typography variant="h6" color="white">
                  Maintenance Queue
                </Typography>
              </Stack>
              <Stack spacing={1.4}>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-MRS-003
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dispatch crew for power module swap.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-PAR-014
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cooling inspection required in the next 6 hours.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-BDX-002
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verify splice point due to repeated attenuation peaks.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RTUInventoryPage;
