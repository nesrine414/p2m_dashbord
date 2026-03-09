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

const PIE_COLORS = ['#4caf50', '#ff9800', '#ef4444', '#b43bf2'];

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
    const unreachable = rtuInventoryRecords.filter((item) => item.status === RTUStatus.UNREACHABLE).length;
    const avgTemp =
      rtuInventoryRecords.reduce((acc, item) => acc + item.temperature, 0) / rtuInventoryRecords.length;

    return {
      total: rtuInventoryRecords.length,
      online,
      warning,
      offline,
      unreachable,
      avgTemp: avgTemp.toFixed(1),
    };
  }, []);

  const statusDistribution = [
    { name: 'Online', value: summary.online },
    { name: 'Warning', value: summary.warning },
    { name: 'Offline', value: summary.offline },
    { name: 'Unreachable', value: summary.unreachable },
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
            Sante RTU: status global, alimentation, communication, disponibilite OTDR.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadOutlined />} sx={{ borderRadius: 2 }}>
          Export Snapshot
        </Button>
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#252d42', border: '1px solid #445069' }}>
            <Typography variant="caption" color="text.secondary">
              Total RTU
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white">
              {summary.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#25362d', border: '1px solid #486957' }}>
            <Typography variant="caption" color="text.secondary">
              Online
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#6ddf9e">
              {summary.online}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#3b3126', border: '1px solid #7a6442' }}>
            <Typography variant="caption" color="text.secondary">
              Warning
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ffb96b">
              {summary.warning}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#3a2b31', border: '1px solid #77525b' }}>
            <Typography variant="caption" color="text.secondary">
              Offline + Unreachable
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ff9fa9">
              {summary.offline + summary.unreachable}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2d3250', border: '1px solid #5f6294' }}>
            <Typography variant="caption" color="text.secondary">
              Average Temperature
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white">
              {summary.avgTemp} C
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
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
              <MenuItem value={RTUStatus.UNREACHABLE}>Unreachable</MenuItem>
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
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              RTU Health Board
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>RTU</TableCell>
                    <TableCell>Zone</TableCell>
                    <TableCell>RTU Status</TableCell>
                    <TableCell>Power</TableCell>
                    <TableCell>Communication</TableCell>
                    <TableCell>OTDR</TableCell>
                    <TableCell>Temperature</TableCell>
                    <TableCell>Attenuation</TableCell>
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
                      <TableCell>
                        <StatusBadge status={record.powerSupply} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.communication} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.otdrAvailability} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
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
                      <TableCell>{record.opticalBudgetDb === 0 ? 'N/A' : `${record.opticalBudgetDb} dB`}</TableCell>
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
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
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

            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <HubOutlined sx={{ color: '#7dc3ff' }} />
                <Typography variant="h6" color="white">
                  Priority Actions
                </Typography>
              </Stack>
              <Stack spacing={1.4}>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-MRS-003
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Replace power module and validate communication.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-TOU-006
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recover reachability and rerun baseline OTDR test.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    RTU-PAR-014
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cooling inspection due to recurrent temperature peaks.
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