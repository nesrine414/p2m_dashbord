import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import {
  AlarmLifecycleStatus,
  CommunicationStatus,
  OtdrAvailabilityStatus,
  PowerSupplyStatus,
  RTUStatus,
} from '../types';
import type { RtuInventoryRecord } from '../data/mockData';
import { getAlarms, getRTUs } from '../services/api';

const PIE_COLORS = ['#4caf50', '#ff9800', '#ef4444', '#b43bf2'];
const VENDORS = ['EXFO', 'Viavi', 'Yokogawa', 'Anritsu'];

const getTemperatureColor = (temperature: number): 'success' | 'warning' | 'error' => {
  if (temperature >= 40) {
    return 'error';
  }
  if (temperature >= 35) {
    return 'warning';
  }
  return 'success';
};

const getVendor = (id: number): string => VENDORS[id % VENDORS.length];

const formatLastSeen = (value?: string | Date | null): string => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes <= 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
};

const toInventoryRecord = (
  item: Awaited<ReturnType<typeof getRTUs>>[number],
  activeAlarms: number
): RtuInventoryRecord => {
  const status = item.status as RTUStatus;
  const isDisconnected = status === RTUStatus.OFFLINE || status === RTUStatus.UNREACHABLE;
  const temperature = item.temperature ?? 0;

  const powerSupply =
    status === RTUStatus.OFFLINE ? PowerSupplyStatus.FAILURE : PowerSupplyStatus.NORMAL;
  const communication = isDisconnected
    ? CommunicationStatus.DISCONNECTED
    : CommunicationStatus.CONNECTED;
  const otdrAvailability =
    status === RTUStatus.ONLINE
      ? OtdrAvailabilityStatus.READY
      : status === RTUStatus.WARNING
        ? OtdrAvailabilityStatus.BUSY
        : OtdrAvailabilityStatus.FAULT;

  const uptimePercent = isDisconnected
    ? status === RTUStatus.UNREACHABLE
      ? 82.4
      : 87.2
    : status === RTUStatus.WARNING
      ? 95.8
      : 99.3;

  const opticalBudgetDb = isDisconnected
    ? 0
    : Number((16 + ((item.id % 6) + 1) * 0.8 + (temperature >= 38 ? 1.8 : 0)).toFixed(1));

  return {
    id: item.id,
    name: item.name,
    zone: item.locationAddress || 'Unknown zone',
    vendor: getVendor(item.id),
    ipAddress: item.ipAddress || 'N/A',
    status,
    powerSupply,
    communication,
    otdrAvailability,
    temperature,
    uptimePercent,
    opticalBudgetDb,
    activeAlarms,
    lastSeen: formatLastSeen(item.lastSeen),
  };
};

const RTUInventoryPage: React.FC = () => {
  const [records, setRecords] = useState<RtuInventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | RTUStatus>('all');
  const [zone, setZone] = useState<'all' | string>('all');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rtuItems, alarmsResponse] = await Promise.all([
          getRTUs(),
          getAlarms({ page: 1, pageSize: 500 }),
        ]);

        if (!active) {
          return;
        }

        const activeAlarmCount = new Map<number, number>();
        alarmsResponse.data
          .filter((alarm) => alarm.lifecycleStatus !== AlarmLifecycleStatus.CLEARED && alarm.rtuId)
          .forEach((alarm) => {
            const key = Number(alarm.rtuId);
            activeAlarmCount.set(key, (activeAlarmCount.get(key) || 0) + 1);
          });

        const mapped = rtuItems.map((item) => toInventoryRecord(item, activeAlarmCount.get(item.id) || 0));
        setRecords(mapped);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Unable to load RTU data from backend. Verify backend is running.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const zoneOptions = useMemo(
    () => ['all', ...Array.from(new Set(records.map((item) => item.zone)))],
    [records]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesSearch =
          record.name.toLowerCase().includes(search.toLowerCase()) ||
          record.ipAddress.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || record.status === status;
        const matchesZone = zone === 'all' || record.zone === zone;
        return matchesSearch && matchesStatus && matchesZone;
      }),
    [records, search, status, zone]
  );

  const summary = useMemo(() => {
    const online = records.filter((item) => item.status === RTUStatus.ONLINE).length;
    const warning = records.filter((item) => item.status === RTUStatus.WARNING).length;
    const offline = records.filter((item) => item.status === RTUStatus.OFFLINE).length;
    const unreachable = records.filter((item) => item.status === RTUStatus.UNREACHABLE).length;
    const avgTemp =
      records.length > 0
        ? records.reduce((acc, item) => acc + item.temperature, 0) / records.length
        : 0;

    return {
      total: records.length,
      online,
      warning,
      offline,
      unreachable,
      avgTemp: avgTemp.toFixed(1),
    };
  }, [records]);

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

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading RTU records from backend...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                {records
                  .filter((item) => item.status !== RTUStatus.ONLINE || item.activeAlarms > 0)
                  .slice(0, 3)
                  .map((item) => (
                    <Box key={item.id}>
                      <Typography variant="body2" color="white" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.activeAlarms > 0
                          ? `Handle ${item.activeAlarms} active alarm(s) and run OTDR validation.`
                          : 'Inspect power/cooling and restore communication baseline.'}
                      </Typography>
                    </Box>
                  ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RTUInventoryPage;
