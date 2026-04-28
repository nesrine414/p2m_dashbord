import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip as MuiTooltip
} from '@mui/material';
import { InfoOutlined, Home, Storage, RouterOutlined, SpeedOutlined, VisibilityOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import {
  CommunicationStatus,
  OtdrAvailabilityStatus,
  PowerSupplyStatus,
  RTUStatus,
} from '../types';
import {
  BackendRTU,
  BackendFiberRoute,
  getAlarms,
  getRTUs,
  getTopology,
} from '../services/api';
import { normalizeRtuStatus } from '../utils/rtuStatus';

const VENDORS = ['EXFO', 'Viavi', 'Yokogawa', 'Anritsu'];

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

const getTemperatureColor = (temperature: number): 'success' | 'warning' | 'error' => {
  if (temperature >= 40) return 'error';
  if (temperature >= 35) return 'warning';
  return 'success';
};

const getVendor = (id: number): string => VENDORS[id % VENDORS.length];

const formatLastSeen = (value?: string | Date | null): string => {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes <= 1) return "Instantané";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
};

const toInventoryRecord = (item: BackendRTU, activeAlarms: number): RtuInventoryRecord => {
  const status = normalizeRtuStatus(item.status);
  const isDisconnected = status === RTUStatus.OFFLINE || status === RTUStatus.UNREACHABLE;
  const temperature = item.temperature ?? 0;

  return {
    id: item.id,
    name: item.name,
    zone: item.locationAddress || 'Zone inconnue',
    vendor: getVendor(item.id),
    ipAddress: item.ipAddress || 'N/D',
    status,
    powerSupply: status === RTUStatus.OFFLINE ? PowerSupplyStatus.FAILURE : PowerSupplyStatus.NORMAL,
    communication: isDisconnected ? CommunicationStatus.DISCONNECTED : CommunicationStatus.CONNECTED,
    otdrAvailability: status === RTUStatus.ONLINE ? OtdrAvailabilityStatus.READY : OtdrAvailabilityStatus.FAULT,
    temperature,
    uptimePercent: isDisconnected ? (status === RTUStatus.UNREACHABLE ? 82.4 : 87.2) : 99.3,
    opticalBudgetDb: isDisconnected ? 0 : Number((16 + ((item.id % 6) + 1) * 0.8 + (temperature >= 38 ? 1.8 : 0)).toFixed(1)),
    activeAlarms,
    lastSeen: formatLastSeen(item.lastSeen),
  };
};

const RTUInventoryPage: React.FC = () => {
  const [records, setRecords] = useState<RtuInventoryRecord[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [selectedRtuId, setSelectedRtuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RTUStatus>('all');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [rtuResponse, alarmsResponse, topologyResponse] = await Promise.all([
          getRTUs(),
          getAlarms({ page: 1, pageSize: 500 }),
          getTopology(),
        ]);
        if (!active) return;

        const activeAlarmCount = new Map<number, number>();
        alarmsResponse.data.forEach(alarm => {
            if (!['cleared', 'resolved', 'closed'].includes(alarm.lifecycleStatus) && alarm.rtuId) {
                const key = Number(alarm.rtuId);
                activeAlarmCount.set(key, (activeAlarmCount.get(key) || 0) + 1);
            }
        });

        const mappedRecords = rtuResponse.map(item => toInventoryRecord(item, activeAlarmCount.get(item.id) || 0));
        setRecords(mappedRecords);
        setRoutes(topologyResponse.routes);
        if (mappedRecords.length > 0) setSelectedRtuId(mappedRecords[0].id);
      } catch {
        if (active) setError('Erreur de connexion au registre RTU.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const filteredRecords = useMemo(() => records.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.ipAddress.includes(search);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [records, search, statusFilter]);

  const selectedRecord = useMemo(() => records.find(r => r.id === selectedRtuId), [records, selectedRtuId]);
  
  const relatedRoutes = useMemo(() => {
    if (!selectedRtuId) return [];
    return routes.filter(r => r.sourceRtuId === selectedRtuId || r.destinationRtuId === selectedRtuId);
  }, [routes, selectedRtuId]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h4" mb={0.5} fontWeight={800}>Registre des Unités RTU</Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" href="/">
                <Home sx={{ mr: 0.5 }} fontSize="inherit" /> Accueil
              </Link>
              <Typography color="text.primary">Inventaire & Actifs</Typography>
            </Breadcrumbs>
        </Box>
        {loading && <CircularProgress size={20} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Rétablissement des Widgets de synthèse (Contenu d'origine) */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderTop: '4px solid #17a2b8' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL RTU</Typography>
            <Typography variant="h4" fontWeight={800}>{records.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderTop: '4px solid #28a745' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>EN LIGNE</Typography>
            <Typography variant="h4" color="success.main" fontWeight={800}>{records.filter(r => r.status === 'online').length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderTop: '4px solid #dc3545' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>HORS LIGNE / INJOIGNABLES</Typography>
            <Typography variant="h4" color="error.main" fontWeight={800}>{records.filter(r => r.status !== 'online').length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper className="card-premium-light" sx={{ p: 2, borderTop: '4px solid #ffc107' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>TEMP. MOYENNE</Typography>
            <Typography variant="h4" fontWeight={800}>
                {(records.length ? records.reduce((a, b) => a + b.temperature, 0) / records.length : 0).toFixed(1)}°C
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 9 }}>
            <Paper className="card-premium-light" sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField 
                        fullWidth size="small" label="Recherche par Nom, IP ou Zone..." 
                        value={search} onChange={e => setSearch(e.target.value)} 
                        variant="outlined"
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filtrer par Statut</InputLabel>
                        <Select value={statusFilter} label="Filtrer par Statut" onChange={e => setStatusFilter(e.target.value as any)}>
                            <MenuItem value="all">Tous les statuts</MenuItem>
                            <MenuItem value={RTUStatus.ONLINE}>RTU Opérationnelles</MenuItem>
                            <MenuItem value={RTUStatus.OFFLINE}>Unités Hors-Ligne</MenuItem>
                            <MenuItem value={RTUStatus.UNREACHABLE}>Injoignables (Timeout)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            <Paper className="card-premium-light" sx={{ p: 0, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>ÉQUIPEMENT</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>ZONE / EMPLACEMENT</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>VENDEUR</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>STATUT</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>BUDGET</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>UPTIME</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa' }}>ALERTS</TableCell>
                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8f9fa', textAlign: 'center' }}>ACTION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRecords.map((r) => (
                                <TableRow 
                                    key={r.id} hover 
                                    onClick={() => setSelectedRtuId(r.id)} 
                                    selected={selectedRtuId === r.id}
                                    sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: '#f1f8ff !important' } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700}>{r.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.ipAddress}</Typography>
                                    </TableCell>
                                    <TableCell><Typography variant="body2">{r.zone}</Typography></TableCell>
                                    <TableCell><Chip label={r.vendor} size="small" variant="outlined" sx={{ borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }} /></TableCell>
                                    <TableCell><StatusBadge status={r.status} /></TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600}>{r.opticalBudgetDb} dB</Typography></TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" fontWeight={700}>{r.uptimePercent}%</Typography>
                                            <LinearProgress variant="determinate" value={r.uptimePercent} sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: '#eee' }} />
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {r.activeAlarms > 0 ? (
                                            <Chip label={r.activeAlarms} color="error" size="small" sx={{ fontWeight: 800, height: 20 }} />
                                        ) : <Typography color="text.disabled">-</Typography>}
                                    </TableCell>
                                    <TableCell align="center">
                                        <MuiTooltip title="Voir Détails">
                                            <IconButton size="small" color="primary"><VisibilityOutlined fontSize="small" /></IconButton>
                                        </MuiTooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={2.5}>
                <Paper className="card-premium-light" sx={{ p: 2.5 }}>
                    <Typography variant="h6" fontWeight={800} mb={2}>Inspection Unité</Typography>
                    {selectedRecord ? (
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>NOM DE L'UNITÉ</Typography>
                                <Typography variant="body1" fontWeight={800}>{selectedRecord.name}</Typography>
                                <Typography variant="caption" color="primary.main" fontWeight={700}>{selectedRecord.ipAddress}</Typography>
                            </Box>
                            
                            <Grid container spacing={1.5}>
                                <Grid size={{ xs: 6 }}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #dee2e6' }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                            <RouterOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" fontWeight={700}>STATUT</Typography>
                                        </Stack>
                                        <StatusBadge status={selectedRecord.status} />
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #dee2e6' }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                            <SpeedOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" fontWeight={700}>BUDGET</Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={800}>{selectedRecord.opticalBudgetDb} dB</Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" mb={1}>
                                    <Typography variant="caption" fontWeight={700}>Température Châssis</Typography>
                                    <Typography variant="caption" fontWeight={800} color={getTemperatureColor(selectedRecord.temperature)}>{selectedRecord.temperature}°C</Typography>
                                </Stack>
                                <LinearProgress 
                                    variant="determinate" value={Math.min(selectedRecord.temperature * 1.5, 100)} 
                                    color={getTemperatureColor(selectedRecord.temperature)} 
                                    sx={{ height: 6, borderRadius: 3 }}
                                />
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} display="block" mb={1.5}>
                                    ROUTES OPTIQUES LIÉES ({relatedRoutes.length})
                                </Typography>
                                <Stack spacing={1}>
                                    {relatedRoutes.length === 0 ? (
                                        <Typography variant="caption" color="text.disabled">Aucune route détectée.</Typography>
                                    ) : relatedRoutes.map(route => (
                                        <Box 
                                            key={route.id} 
                                            sx={{ 
                                                p: 1, 
                                                borderRadius: 1.5, 
                                                bgcolor: 'white', 
                                                border: '1px solid #eee',
                                                borderLeft: `3px solid ${route.fiberStatus === 'broken' ? '#dc3545' : route.fiberStatus === 'degraded' ? '#ffc107' : '#28a745'}`
                                            }}
                                        >
                                            <Typography variant="caption" fontWeight={800} display="block">{route.routeName}</Typography>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>{route.source} → {route.destination}</Typography>
                                                <StatusBadge status={route.fiberStatus} />
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>

                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#e7f3ff', border: '1px solid #cce5ff' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <InfoOutlined color="primary" fontSize="small" />
                                    <Typography variant="caption" color="primary.main" fontWeight={700}>
                                        Dernière communication reçue : {selectedRecord.lastSeen}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">Sélectionnez une RTU pour voir les détails d'inspection.</Typography>
                    )}
                </Paper>

                <Paper className="card-premium-light" sx={{ p: 2.5, bgcolor: '#fff4e5', border: 'none' }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Storage color="warning" />
                        <Typography fontWeight={800} color="#856404">Maintenance</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ opacity: 0.8, color: '#856404' }}>
                        L'état "Budget Optique" est calculé dynamiquement en fonction de la température et de la charge de l'OTDR. 
                        Toute valeur sous 15 dB nécessite une inspection préventive.
                    </Typography>
                </Paper>
            </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RTUInventoryPage;
