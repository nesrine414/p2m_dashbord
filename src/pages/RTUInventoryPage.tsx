import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
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
import { HubOutlined, RouteOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import {
  AlarmLifecycleStatus,
  CommunicationStatus,
  FiberStatus,
  OtdrAvailabilityStatus,
  PowerSupplyStatus,
  RTUStatus,
} from '../types';
import {
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
  getAlarms,
  getRecentOtdrTests,
  getRTUs,
  getTopology,
} from '../services/api';

const PIE_COLORS = ['#4caf50', '#ff9800', '#ef4444', '#b43bf2'];
const VENDORS = ['EXFO', 'Viavi', 'Yokogawa', 'Anritsu'];
const MAX_RELATED_ROUTES = 8;

interface RtuInventoryRecord {
  id: number;
  name: string;
  zone: string;
  vendor: string;
  ipAddress: string;
  status: RTUStatus;
  powerSupply: PowerSupplyStatus;
  communication: CommunicationStatus;
  otdrAvailability: OtdrAvailabilityStatus;
  temperature: number;
  uptimePercent: number;
  opticalBudgetDb: number;
  activeAlarms: number;
  lastSeen: string;
}

interface SelectedDetailRow {
  id: string;
  domain: string;
  parameter: string;
  description: string;
  currentValue: React.ReactNode;
  widgetType: string;
  criticality: 'Critique' | 'Moyenne' | 'Faible';
}

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

const getFiberStatusText = (status: BackendFiberRoute['fiberStatus']): string => {
  switch (status) {
    case FiberStatus.BROKEN:
      return 'Broken';
    case FiberStatus.DEGRADED:
      return 'Degraded';
    case FiberStatus.NORMAL:
    default:
      return 'Normal';
  }
};

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCoordinates = (rtu: BackendRTU): boolean =>
  parseCoordinate(rtu.locationLatitude) !== null && parseCoordinate(rtu.locationLongitude) !== null;

const formatLastSeen = (value?: string | Date | null): string => {
  if (!value) {
    return 'N/D';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes <= 1) {
    return "A l'instant";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} j`;
};

const normalizeEntityLabel = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^rtu[-_\s]*/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const createRtuAliases = (rtu: BackendRTU): string[] => {
  const rawName = rtu.name || '';
  const aliases = new Set<string>();

  [
    rawName,
    rawName.replace(/^RTU[-_\s]*/i, ''),
    rawName.replace(/-/g, ' '),
    rtu.locationAddress || '',
  ]
    .map((value) => normalizeEntityLabel(value))
    .filter(Boolean)
    .forEach((value) => aliases.add(value));

  return Array.from(aliases);
};

const routeMatchesRtu = (route: BackendFiberRoute, rtu: BackendRTU): boolean => {
  const aliases = createRtuAliases(rtu);
  const source = normalizeEntityLabel(route.source);
  const destination = normalizeEntityLabel(route.destination);

  return aliases.some(
    (alias) =>
      alias === source ||
      alias === destination ||
      source.includes(alias) ||
      destination.includes(alias) ||
      alias.includes(source) ||
      alias.includes(destination)
  );
};

const getRoutePriority = (route: BackendFiberRoute): number => {
  switch (route.fiberStatus) {
    case FiberStatus.BROKEN:
      return 3;
    case FiberStatus.DEGRADED:
      return 2;
    default:
      return 1;
  }
};

const toInventoryRecord = (item: BackendRTU, activeAlarms: number): RtuInventoryRecord => {
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
    zone: item.locationAddress || 'Zone inconnue',
    vendor: getVendor(item.id),
    ipAddress: item.ipAddress || 'N/D',
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
  const [rtuItems, setRtuItems] = useState<BackendRTU[]>([]);
  const [records, setRecords] = useState<RtuInventoryRecord[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [otdrTests, setOtdrTests] = useState<BackendOtdrTest[]>([]);
  const [selectedRtuId, setSelectedRtuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | RTUStatus>('all');
  const [zone, setZone] = useState<'all' | string>('all');
  const routesSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rtuResponse, alarmsResponse, topologyResponse, otdrResponse] = await Promise.all([
          getRTUs(),
          getAlarms({ page: 1, pageSize: 500 }),
          getTopology(),
          getRecentOtdrTests(),
        ]);

        if (!active) {
          return;
        }

        const mappableRtus = rtuResponse.filter(hasCoordinates);
        const activeAlarmCount = new Map<number, number>();

        alarmsResponse.data
          .filter((alarm) => alarm.lifecycleStatus !== AlarmLifecycleStatus.CLEARED && alarm.rtuId)
          .forEach((alarm) => {
            const key = Number(alarm.rtuId);
            activeAlarmCount.set(key, (activeAlarmCount.get(key) || 0) + 1);
          });

        const mappedRecords = mappableRtus.map((item) =>
          toInventoryRecord(item, activeAlarmCount.get(item.id) || 0)
        );

        setRtuItems(mappableRtus);
        setRecords(mappedRecords);
        setRoutes(topologyResponse.routes.slice(0, MAX_RELATED_ROUTES));
        setOtdrTests(otdrResponse.data);
        setSelectedRtuId((current) => current ?? mappedRecords[0]?.id ?? null);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError('Impossible de charger les RTU et les routes optiques depuis le backend.');
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
        const query = search.toLowerCase();
        const matchesSearch =
          record.name.toLowerCase().includes(query) ||
          record.ipAddress.toLowerCase().includes(query) ||
          record.zone.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || record.status === status;
        const matchesZone = zone === 'all' || record.zone === zone;
        return matchesSearch && matchesStatus && matchesZone;
      }),
    [records, search, status, zone]
  );

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedRtuId(null);
      return;
    }

    const stillVisible = filteredRecords.some((record) => record.id === selectedRtuId);
    if (!stillVisible) {
      setSelectedRtuId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedRtuId]);

  const selectedRtu = useMemo(
    () => rtuItems.find((item) => item.id === selectedRtuId) || null,
    [rtuItems, selectedRtuId]
  );

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedRtuId) || null,
    [records, selectedRtuId]
  );

  const relatedRoutes = useMemo(() => {
    if (!selectedRtu) {
      return [];
    }

    return routes
      .filter((route) => routeMatchesRtu(route, selectedRtu))
      .sort((left, right) => getRoutePriority(right) - getRoutePriority(left))
      .slice(0, MAX_RELATED_ROUTES);
  }, [routes, selectedRtu]);

  const selectedDetailRows = useMemo<SelectedDetailRow[]>(() => {
    if (!selectedRecord) {
      return [];
    }

    const rows: SelectedDetailRow[] = [
      {
        id: `rtu-status-${selectedRecord.id}`,
        domain: 'RTU',
        parameter: 'RTU Status',
        description: `Etat global de ${selectedRecord.name}`,
        currentValue: <StatusBadge status={selectedRecord.status} />,
        widgetType: 'Tuile / LED',
        criticality: 'Critique',
      },
      {
        id: `rtu-power-${selectedRecord.id}`,
        domain: 'RTU',
        parameter: 'Power Supply',
        description: 'Etat alimentation RTU',
        currentValue: <StatusBadge status={selectedRecord.powerSupply} variant="outlined" />,
        widgetType: 'Tuile',
        criticality: 'Critique',
      },
      {
        id: `rtu-temp-${selectedRecord.id}`,
        domain: 'RTU',
        parameter: 'Temperature',
        description: 'Temperature interne RTU',
        currentValue:
          selectedRecord.temperature > 0 ? `${selectedRecord.temperature} C` : 'N/D',
        widgetType: 'Jauge',
        criticality: 'Moyenne',
      },
      {
        id: `rtu-otdr-${selectedRecord.id}`,
        domain: 'RTU',
        parameter: 'OTDR Availability',
        description: 'Disponibilite OTDR',
        currentValue: <StatusBadge status={selectedRecord.otdrAvailability} variant="outlined" />,
        widgetType: 'Icone statut',
        criticality: 'Critique',
      },
    ];

    relatedRoutes.forEach((route) => {
      const latestOtdr =
        otdrTests.find((test) => test.routeId === route.id) ||
        otdrTests.find((test) => test.routeName === route.routeName);

      rows.push({
        id: `fiber-${route.id}`,
        domain: 'Fibre',
        parameter: route.routeName,
        description: `${route.source} -> ${route.destination}`,
        currentValue: (
          <Stack spacing={0.4}>
            <Typography variant="caption" color="white">
              Fibre: {getFiberStatusText(route.fiberStatus)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Route: {route.routeStatus}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Longueur: {route.lengthKm ? `${route.lengthKm.toFixed(2)} km` : 'N/D'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Attenuation: {route.attenuationDb && route.attenuationDb > 0 ? `${route.attenuationDb.toFixed(2)} dB` : 'N/D'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dernier test: {formatLastSeen(route.lastTestTime)}
            </Typography>
          </Stack>
        ),
        widgetType: 'Liste / Carte',
        criticality: route.fiberStatus === FiberStatus.NORMAL ? 'Faible' : 'Critique',
      });

      rows.push({
        id: `otdr-${route.id}`,
        domain: 'OTDR',
        parameter: `Mesure ${route.routeName}`,
        description: `Mesure OTDR associee a ${route.routeName}`,
        currentValue: latestOtdr ? (
          <Stack spacing={0.4}>
            <Typography variant="caption" color="white">
              Resultat: {latestOtdr.result.toUpperCase()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mode: {latestOtdr.mode}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Wavelength: {latestOtdr.wavelengthNm} nm
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pulse: {latestOtdr.pulseWidth || 'N/D'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dernier test: {formatLastSeen(latestOtdr.testedAt)}
            </Typography>
          </Stack>
        ) : (
          'Aucune mesure OTDR recente'
        ),
        widgetType: 'Tableau',
        criticality: latestOtdr?.result === 'fail' ? 'Critique' : 'Moyenne',
      });
    });

    return rows;
  }, [otdrTests, relatedRoutes, selectedRecord]);

  const routeCounts = useMemo(() => {
    const counts = new Map<number, number>();

    rtuItems.forEach((rtu) => {
      counts.set(
        rtu.id,
        routes.filter((route) => routeMatchesRtu(route, rtu)).slice(0, MAX_RELATED_ROUTES).length
      );
    });

    return counts;
  }, [routes, rtuItems]);

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
    { name: 'En ligne', value: summary.online },
    { name: 'Avertissement', value: summary.warning },
    { name: 'Hors ligne', value: summary.offline },
    { name: 'Injoignable', value: summary.unreachable },
  ];

  const handleStatusChange = (event: SelectChangeEvent<'all' | RTUStatus>) => {
    setStatus(event.target.value as 'all' | RTUStatus);
  };

  const handleZoneChange = (event: SelectChangeEvent<'all' | string>) => {
    setZone(event.target.value);
  };

  const handleSelectRtu = (rtuId: number) => {
    setSelectedRtuId(rtuId);
    window.requestAnimationFrame(() => {
      routesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
            Inventaire RTU
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Les RTU affiches ici sont les noeuds GPS reels. Cliquez sur une RTU pour voir ses routes optiques.
          </Typography>
        </Box>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement des RTU et des routes optiques...
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
              RTU GPS total
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white">
              {summary.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#25362d', border: '1px solid #486957' }}>
            <Typography variant="caption" color="text.secondary">
              En ligne
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#6ddf9e">
              {summary.online}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#3b3126', border: '1px solid #7a6442' }}>
            <Typography variant="caption" color="text.secondary">
              Avertissement
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ffb96b">
              {summary.warning}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#3a2b31', border: '1px solid #77525b' }}>
            <Typography variant="caption" color="text.secondary">
              Hors ligne + injoignables
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#ff9fa9">
              {summary.offline + summary.unreachable}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#2d3250', border: '1px solid #5f6294' }}>
            <Typography variant="caption" color="text.secondary">
              Temperature moyenne
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
            label="Rechercher une RTU ou une IP"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Statut</InputLabel>
            <Select label="Statut" value={status} onChange={handleStatusChange}>
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value={RTUStatus.ONLINE}>En ligne</MenuItem>
              <MenuItem value={RTUStatus.WARNING}>Avertissement</MenuItem>
              <MenuItem value={RTUStatus.OFFLINE}>Hors ligne</MenuItem>
              <MenuItem value={RTUStatus.UNREACHABLE}>Injoignable</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zone</InputLabel>
            <Select label="Zone" value={zone} onChange={handleZoneChange}>
              {zoneOptions.map((zoneOption) => (
                <MenuItem key={zoneOption} value={zoneOption}>
                  {zoneOption === 'all' ? 'Toutes les zones' : zoneOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              Tableau de sante RTU
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Cliquez sur une ligne pour afficher les routes optiques reliees a cette RTU.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>RTU</TableCell>
                    <TableCell>Zone</TableCell>
                    <TableCell>Etat RTU</TableCell>
                    <TableCell>Alimentation</TableCell>
                    <TableCell>Communication</TableCell>
                    <TableCell>OTDR</TableCell>
                    <TableCell>Temperature</TableCell>
                    <TableCell>Routes optiques</TableCell>
                    <TableCell>Derniere vue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                      selected={record.id === selectedRtuId}
                      onClick={() => handleSelectRtu(record.id)}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { backgroundColor: 'rgba(104, 176, 255, 0.14)' },
                        '&.Mui-selected:hover': { backgroundColor: 'rgba(104, 176, 255, 0.2)' },
                      }}
                    >
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
                          {record.temperature === 0 ? 'N/D' : `${record.temperature} C`}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(record.temperature * 2, 100)}
                          color={getTemperatureColor(record.temperature)}
                          sx={{ mt: 0.6, height: 6, borderRadius: 4 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="white" fontWeight={700}>
                          {routeCounts.get(record.id) || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          max {MAX_RELATED_ROUTES}
                        </Typography>
                      </TableCell>
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
                Repartition des statuts du parc
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
                  RTU selectionnee
                </Typography>
              </Stack>
              {selectedRecord ? (
                <Stack spacing={1.1}>
                  <Typography variant="body1" color="white" fontWeight={700}>
                    {selectedRecord.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Zone: {selectedRecord.zone}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    IP: {selectedRecord.ipAddress}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fournisseur: {selectedRecord.vendor}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alarmes actives: {selectedRecord.activeAlarms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Routes optiques associees: {relatedRoutes.length}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Selectionnez une RTU dans le tableau.
                </Typography>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Paper
        ref={routesSectionRef}
        sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <RouteOutlined sx={{ color: '#8fd3ff' }} />
          <Typography variant="h6" color="white">
            Tableau detaille RTU / Fibres
          </Typography>
        </Stack>
        {selectedRecord && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {selectedRecord.name} - chaque RTU peut afficher jusqu'a {MAX_RELATED_ROUTES} fibres associees.
          </Typography>
        )}

        {selectedRecord && selectedDetailRows.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Domaine</TableCell>
                  <TableCell>Parametre</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Etat / Valeur actuelle</TableCell>
                  <TableCell>Type de widget recommande</TableCell>
                  <TableCell>Criticite</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedDetailRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.domain}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="white" fontWeight={700}>
                        {row.parameter}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.currentValue}</TableCell>
                    <TableCell>{row.widgetType}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                          row.criticality === 'Critique'
                            ? '#ff9fa9'
                            : row.criticality === 'Moyenne'
                              ? '#ffcf86'
                              : '#9eddb0'
                        }
                      >
                        {row.criticality}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {selectedRecord
              ? "Aucune route optique n'a ete rattachee a cette RTU."
              : 'Selectionnez une RTU pour afficher ses routes optiques.'}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default RTUInventoryPage;
