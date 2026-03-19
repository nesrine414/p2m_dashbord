import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { BackendFiberRoute, BackendRTU } from '../../services/api';
import manualRoutesData from '../../data/tunisiaRoutes.json';
import { FiberStatus, RTUStatus } from '../../types';

interface RtuNode {
  id: string;
  city: string;
  name?: string;
  status: RTUStatus;
  lat: number;
  lon: number;
}

interface RtuLink {
  id: string;
  from: string;
  to: string;
  status: FiberStatus;
}

const BASE_NODES: RtuNode[] = [
  { id: 'tunis', city: 'Tunis', name: 'Tunis', status: RTUStatus.ONLINE, lat: 36.8065, lon: 10.1815 },
  { id: 'bizerte', city: 'Bizerte', name: 'Bizerte', status: RTUStatus.WARNING, lat: 37.2746, lon: 9.8739 },
  { id: 'nabeul', city: 'Nabeul', name: 'Nabeul', status: RTUStatus.ONLINE, lat: 36.4513, lon: 10.7353 },
  { id: 'sousse', city: 'Sousse', name: 'Sousse', status: RTUStatus.ONLINE, lat: 35.8256, lon: 10.636 },
  { id: 'monastir', city: 'Monastir', name: 'Monastir', status: RTUStatus.WARNING, lat: 35.7643, lon: 10.8113 },
  { id: 'sfax', city: 'Sfax', name: 'Sfax', status: RTUStatus.ONLINE, lat: 34.7398, lon: 10.76 },
  { id: 'kairouan', city: 'Kairouan', name: 'Kairouan', status: RTUStatus.ONLINE, lat: 35.6781, lon: 10.0963 },
  { id: 'gafsa', city: 'Gafsa', name: 'Gafsa', status: RTUStatus.WARNING, lat: 34.4311, lon: 8.7757 },
  { id: 'tozeur', city: 'Tozeur', name: 'Tozeur', status: RTUStatus.ONLINE, lat: 33.9197, lon: 8.1335 },
  { id: 'gabes', city: 'Gabes', name: 'Gabes', status: RTUStatus.ONLINE, lat: 33.8881, lon: 10.0972 },
  { id: 'medenine', city: 'Medenine', name: 'Medenine', status: RTUStatus.WARNING, lat: 33.3549, lon: 10.5055 },
  { id: 'djerba', city: 'Djerba', name: 'Djerba', status: RTUStatus.ONLINE, lat: 33.875, lon: 10.8575 },
  { id: 'tataouine', city: 'Tataouine', name: 'Tataouine', status: RTUStatus.OFFLINE, lat: 32.9297, lon: 10.4518 },
  { id: 'kasserine', city: 'Kasserine', name: 'Kasserine', status: RTUStatus.WARNING, lat: 35.1676, lon: 8.8365 },
  { id: 'beja', city: 'Beja', name: 'Beja', status: RTUStatus.ONLINE, lat: 36.7256, lon: 9.1817 },
];

const LINKS: RtuLink[] = [
  { id: 'l1', from: 'tunis', to: 'bizerte', status: FiberStatus.NORMAL },
  { id: 'l2', from: 'tunis', to: 'nabeul', status: FiberStatus.NORMAL },
  { id: 'l3', from: 'tunis', to: 'kairouan', status: FiberStatus.DEGRADED },
  { id: 'l4', from: 'kairouan', to: 'sousse', status: FiberStatus.NORMAL },
  { id: 'l5', from: 'sousse', to: 'sfax', status: FiberStatus.NORMAL },
  { id: 'l6', from: 'sfax', to: 'gabes', status: FiberStatus.DEGRADED },
  { id: 'l7', from: 'gabes', to: 'medenine', status: FiberStatus.DEGRADED },
  { id: 'l8', from: 'medenine', to: 'tataouine', status: FiberStatus.BROKEN },
  { id: 'l9', from: 'medenine', to: 'djerba', status: FiberStatus.NORMAL },
  { id: 'l10', from: 'kairouan', to: 'gafsa', status: FiberStatus.DEGRADED },
  { id: 'l11', from: 'gafsa', to: 'tozeur', status: FiberStatus.NORMAL },
  { id: 'l12', from: 'kasserine', to: 'gafsa', status: FiberStatus.NORMAL },
  { id: 'l13', from: 'beja', to: 'tunis', status: FiberStatus.NORMAL },
  { id: 'l14', from: 'sousse', to: 'monastir', status: FiberStatus.NORMAL },
];

const getNodeColor = (status: RTUStatus) => {
  switch (status) {
    case RTUStatus.ONLINE:
      return '#00FF88';
    case RTUStatus.WARNING:
      return '#FFB800';
    default:
      return '#FF3366';
  }
};

const getLinkColor = (status: FiberStatus) => {
  switch (status) {
    case FiberStatus.BROKEN:
      return '#FF3366';
    case FiberStatus.DEGRADED:
      return '#FFB800';
    default:
      return '#5cc2ff';
  }
};

const getLinkDash = (status: FiberStatus) => {
  if (status === FiberStatus.DEGRADED) return '8 6';
  if (status === FiberStatus.BROKEN) return '4 6';
  return undefined;
};

interface RealtimeTunisiaMapProps {
  routes?: BackendFiberRoute[];
  rtus?: BackendRTU[];
  enableEditor?: boolean;
}

interface RouteSegment {
  id: string | number;
  status: FiberStatus;
  positions: Array<[number, number]>;
  routeName?: string;
}

type Bounds = [[number, number], [number, number]];
type LatLon = [number, number];

const isNonNullable = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;

interface EditorRoute {
  id: string;
  routeName: string;
  fiberStatus: FiberStatus;
  path: LatLon[];
}

interface ManualRouteInput {
  routeName?: string;
  fiberStatus?: FiberStatus | string;
  path?: LatLon[];
}

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const toRtuStatus = (value?: string | null): RTUStatus => {
  switch (value) {
    case RTUStatus.ONLINE:
      return RTUStatus.ONLINE;
    case RTUStatus.WARNING:
      return RTUStatus.WARNING;
    case RTUStatus.UNREACHABLE:
      return RTUStatus.UNREACHABLE;
    case RTUStatus.OFFLINE:
      return RTUStatus.OFFLINE;
    default:
      return RTUStatus.OFFLINE;
  }
};

const toFiberStatus = (value?: string | null): FiberStatus => {
  switch (value) {
    case FiberStatus.BROKEN:
      return FiberStatus.BROKEN;
    case FiberStatus.DEGRADED:
      return FiberStatus.DEGRADED;
    case FiberStatus.NORMAL:
      return FiberStatus.NORMAL;
    default:
      return FiberStatus.NORMAL;
  }
};

const normalizeKey = (value?: string | null): string | null => {
  if (!value) return null;
  return value.trim().toLowerCase();
};

const FitBounds: React.FC<{ bounds: Bounds | null }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 9 });
  }, [bounds, map]);

  return null;
};

const STORAGE_KEY = 'tunisia_route_editor_routes_v1';

const EditorClickHandler: React.FC<{
  active: boolean;
  onAddPoint: (point: LatLon) => void;
}> = ({ active, onAddPoint }) => {
  useMapEvents({
    click: (event) => {
      if (!active) return;
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

const RealtimeTunisiaMap: React.FC<RealtimeTunisiaMapProps> = ({ routes, rtus, enableEditor = false }) => {
  const rtuNodes = useMemo<RtuNode[]>(() => {
    if (!rtus || rtus.length === 0) return [];
    return rtus
      .map<RtuNode | null>((rtu) => {
        const lat = parseCoordinate(rtu.locationLatitude);
        const lon = parseCoordinate(rtu.locationLongitude);
        if (lat === null || lon === null) return null;
        return {
          id: `rtu-${rtu.id}`,
          city: rtu.locationAddress || rtu.name,
          name: rtu.name,
          status: toRtuStatus(rtu.status),
          lat,
          lon,
        };
      })
      .filter(isNonNullable);
  }, [rtus]);

  const hasRealtimeNodes = rtuNodes.length > 0;
  const displayNodes = useMemo<RtuNode[]>(() => {
    const combined: RtuNode[] = [];
    const seen = new Set<string>();

    const remember = (node: RtuNode) => {
      const keys = [normalizeKey(node.city), normalizeKey(node.name), normalizeKey(node.id)].filter(
        (value): value is string => Boolean(value)
      );

      if (keys.some((key) => seen.has(key))) {
        return;
      }

      keys.forEach((key) => seen.add(key));
      combined.push(node);
    };

    rtuNodes.forEach(remember);
    BASE_NODES.forEach(remember);

    return combined;
  }, [rtuNodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, RtuNode>();
    displayNodes.forEach((node) => {
      const cityKey = normalizeKey(node.city);
      if (cityKey) map.set(cityKey, node);
      const nameKey = normalizeKey(node.name);
      if (nameKey) map.set(nameKey, node);
    });
    return map;
  }, [displayNodes]);

  const backendPathSegments = useMemo<RouteSegment[]>(() => {
    if (!routes || routes.length === 0) return [];
    const segments: RouteSegment[] = [];

    routes.forEach((route) => {
      const status = toFiberStatus(route.fiberStatus);
      const rawPath = Array.isArray(route.path) ? route.path : null;
      if (!rawPath || rawPath.length < 2) return;
      const positions = rawPath
        .map((pair) => {
          const lat = parseCoordinate(pair?.[0]);
          const lon = parseCoordinate(pair?.[1]);
          if (lat === null || lon === null) return null;
          return [lat, lon] as [number, number];
        })
        .filter((pair): pair is [number, number] => Boolean(pair));
      if (positions.length < 2) return;
      segments.push({ id: route.id, status, positions, routeName: route.routeName });
    });

    return segments;
  }, [routes]);

  const backendEndpointSegments = useMemo<RouteSegment[]>(() => {
    if (!routes || routes.length === 0 || !hasRealtimeNodes) return [];
    const segments: RouteSegment[] = [];

    routes.forEach((route) => {
      const status = toFiberStatus(route.fiberStatus);
      if (Array.isArray(route.path) && route.path.length >= 2) return;
      const fromKey = normalizeKey(route.source);
      const toKey = normalizeKey(route.destination);
      const from = fromKey ? nodeMap.get(fromKey) : undefined;
      const to = toKey ? nodeMap.get(toKey) : undefined;
      if (!from || !to) return;
      segments.push({
        id: route.id,
        status,
        routeName: route.routeName,
        positions: [
          [from.lat, from.lon],
          [to.lat, to.lon],
        ],
      });
    });

    return segments;
  }, [routes, hasRealtimeNodes, nodeMap]);

  const manualSegments = useMemo<RouteSegment[]>(() => {
    const manualRoutes = manualRoutesData as ManualRouteInput[];
    if (!Array.isArray(manualRoutes)) return [];
    return manualRoutes
      .map<RouteSegment | null>((route, index) => {
        if (!route || !Array.isArray(route.path)) return null;
        const positions = route.path
          .map((pair) => {
            const lat = parseCoordinate(pair?.[0]);
            const lon = parseCoordinate(pair?.[1]);
            if (lat === null || lon === null) return null;
            return [lat, lon] as [number, number];
          })
          .filter((pair): pair is [number, number] => Boolean(pair));
        if (positions.length < 2) return null;
        return {
          id: `manual-${index}`,
          status: toFiberStatus(route.fiberStatus),
          routeName: route.routeName,
          positions,
        };
      })
      .filter(isNonNullable);
  }, []);

  const fallbackRoutes = useMemo<RouteSegment[]>(() => {
    const baseMap = new Map(BASE_NODES.map((node) => [node.id, node]));
    return LINKS.map<RouteSegment | null>((link) => {
      const from = baseMap.get(link.from);
      const to = baseMap.get(link.to);
      if (!from || !to) return null;
      return {
        id: link.id,
        status: link.status,
        positions: [
          [from.lat, from.lon],
          [to.lat, to.lon],
        ],
      };
    }).filter(isNonNullable);
  }, []);

  const displayRoutes = useMemo(() => {
    if (manualSegments.length > 0 && backendPathSegments.length === 0) {
      return manualSegments;
    }
    if (backendPathSegments.length > 0) {
      return backendPathSegments;
    }
    if (backendEndpointSegments.length > 0) {
      return backendEndpointSegments;
    }
    if (manualSegments.length > 0) {
      return manualSegments;
    }
    return fallbackRoutes;
  }, [backendEndpointSegments, backendPathSegments, fallbackRoutes, manualSegments]);

  const bounds = useMemo<Bounds | null>(() => {
    if (displayNodes.length === 0) return null;
    const lats = displayNodes.map((node) => node.lat);
    const lons = displayNodes.map((node) => node.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return [
      [minLat, minLon],
      [maxLat, maxLon],
    ];
  }, [displayNodes]);

  const showMissingCoords = !hasRealtimeNodes && (rtus?.length || 0) > 0;
  const showMissingRoutes = hasRealtimeNodes && (routes?.length || 0) > 0 && displayRoutes.length === 0;
  const showManualRoutes = manualSegments.length > 0;

  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<LatLon[]>([]);
  const [routeName, setRouteName] = useState('');
  const [routeStatus, setRouteStatus] = useState<FiberStatus>(FiberStatus.NORMAL);
  const [editorRoutes, setEditorRoutes] = useState<EditorRoute[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enableEditor) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as EditorRoute[];
      if (Array.isArray(parsed)) {
        setEditorRoutes(parsed);
      }
    } catch {
      // Ignore malformed saved data.
    }
  }, [enableEditor]);

  useEffect(() => {
    if (!enableEditor) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editorRoutes));
  }, [editorRoutes, enableEditor]);

  const exportJson = useMemo(
    () =>
      JSON.stringify(
        editorRoutes.map((route) => ({
          routeName: route.routeName,
          fiberStatus: route.fiberStatus,
          path: route.path,
        })),
        null,
        2
      ),
    [editorRoutes]
  );

  const onAddPoint = (point: LatLon) => {
    setDraftPoints((current) => [...current, point]);
  };

  const onUndoPoint = () => {
    setDraftPoints((current) => current.slice(0, -1));
  };

  const onClearDraft = () => {
    setDraftPoints([]);
  };

  const onSaveRoute = () => {
    const trimmed = routeName.trim();
    if (!trimmed || draftPoints.length < 2) return;
    const newRoute: EditorRoute = {
      id: `${Date.now()}`,
      routeName: trimmed,
      fiberStatus: routeStatus,
      path: [...draftPoints],
    };
    setEditorRoutes((current) => [newRoute, ...current]);
    setDraftPoints([]);
    setRouteName('');
    setIsDrawing(false);
  };

  const onDeleteRoute = (id: string) => {
    setEditorRoutes((current) => current.filter((route) => route.id !== id));
  };

  const onCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const onDownloadJson = () => {
    try {
      const blob = new Blob([exportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tunisia-routes.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download errors.
    }
  };

  return (
    <Box sx={{ position: 'relative', height: 420, borderRadius: 3, overflow: 'hidden' }}>
      <MapContainer
        center={[34.5, 9.6]}
        zoom={6.4}
        minZoom={5}
        maxZoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <FitBounds bounds={bounds} />
        {enableEditor && <EditorClickHandler active={isDrawing} onAddPoint={onAddPoint} />}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {displayRoutes.map((link) => (
          <Polyline
            key={link.id}
            positions={link.positions}
            pathOptions={{
              color: getLinkColor(link.status),
              weight: 3,
              dashArray: getLinkDash(link.status),
              opacity: 0.85,
            }}
          />
        ))}

        {editorRoutes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{
              color: getLinkColor(route.fiberStatus),
              weight: 4,
              opacity: 0.9,
            }}
          />
        ))}

        {draftPoints.length >= 2 && (
          <Polyline
            positions={draftPoints}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              dashArray: '6 6',
              opacity: 0.9,
            }}
          />
        )}

        {draftPoints.map((point, index) => (
          <CircleMarker
            key={`draft-${index}`}
            center={point}
            radius={4}
            pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.9 }}
          />
        ))}

        {displayNodes.map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lon]}
            radius={6}
            pathOptions={{
              color: getNodeColor(node.status),
              fillColor: getNodeColor(node.status),
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <strong>{node.city}</strong> - {node.status}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: 16,
          px: 1.4,
          py: 0.6,
          borderRadius: 2,
          backgroundColor: 'rgba(12, 18, 33, 0.75)',
          border: '1px solid rgba(156, 176, 217, 0.28)',
          color: 'white',
        }}
      >
        <Typography variant="caption" fontWeight={700}>
          Tunisia RTU Live Map
        </Typography>
        {showManualRoutes && (
          <Typography variant="caption" color="text.secondary" display="block">
            Manual routes loaded: {manualSegments.length}
          </Typography>
        )}
        {(showMissingCoords || showMissingRoutes) && (
          <Typography variant="caption" color="text.secondary" display="block">
            {showMissingCoords
              ? 'No RTU GPS coordinates found yet.'
              : 'Route geometry missing: add path data or align source/destination.'}
          </Typography>
        )}
      </Box>

      {enableEditor && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            width: 300,
            maxHeight: '70%',
            overflow: 'auto',
            backgroundColor: 'rgba(12, 18, 33, 0.88)',
            border: '1px solid rgba(156, 176, 217, 0.28)',
            borderRadius: 2,
            p: 1.4,
          }}
        >
          <Typography variant="subtitle2" color="white" fontWeight={700} mb={1}>
            Route Editor
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Click "Draw" then click the map to add points.
          </Typography>
          <Stack spacing={1}>
            <TextField
              size="small"
              label="Route name"
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              error={Boolean(routeName) && routeName.trim().length === 0}
              helperText={routeName.trim().length === 0 ? 'Route name required to save.' : ' '}
            />
            <FormControl size="small">
              <InputLabel id="fiber-status-label">Fiber status</InputLabel>
              <Select
                labelId="fiber-status-label"
                value={routeStatus}
                label="Fiber status"
                onChange={(event) => setRouteStatus(event.target.value as FiberStatus)}
              >
                <MenuItem value={FiberStatus.NORMAL}>Normal</MenuItem>
                <MenuItem value={FiberStatus.DEGRADED}>Degraded</MenuItem>
                <MenuItem value={FiberStatus.BROKEN}>Broken</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button
                variant={isDrawing ? 'contained' : 'outlined'}
                onClick={() => setIsDrawing((current) => !current)}
                fullWidth
              >
                {isDrawing ? 'Drawing...' : 'Draw'}
              </Button>
              <Button variant="outlined" onClick={onUndoPoint} disabled={draftPoints.length === 0} fullWidth>
                Undo
              </Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onClearDraft} disabled={draftPoints.length === 0} fullWidth>
                Clear
              </Button>
              <Button
                variant="contained"
                onClick={onSaveRoute}
                disabled={routeName.trim().length === 0 || draftPoints.length < 2}
                fullWidth
              >
                Save
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Typography variant="caption" color="text.secondary" display="block" mb={0.8}>
            Saved routes ({editorRoutes.length})
          </Typography>
          <Stack spacing={0.8}>
            {editorRoutes.map((route) => (
              <Box
                key={route.id}
                sx={{
                  p: 0.8,
                  borderRadius: 1.4,
                  backgroundColor: 'rgba(25, 32, 48, 0.9)',
                }}
              >
                <Typography variant="caption" color="white" fontWeight={600} display="block">
                  {route.routeName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {route.path.length} points - {route.fiberStatus}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onDeleteRoute(route.id)}
                  sx={{ color: '#ff8d9a', px: 0 }}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Stack spacing={0.8}>
            <TextField
              label="Export JSON"
              value={exportJson}
              multiline
              minRows={4}
              maxRows={8}
              size="small"
              InputProps={{ readOnly: true }}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onCopyJson} fullWidth>
                {copied ? 'Copied' : 'Copy JSON'}
              </Button>
              <Button variant="outlined" onClick={onDownloadJson} fullWidth>
                Download
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Box sx={{ position: 'absolute', right: 16, bottom: 16 }}>
        <Stack spacing={0.6} sx={{ backgroundColor: 'rgba(12, 18, 33, 0.75)', p: 1.2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Fiber status legend
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 2, backgroundColor: '#5cc2ff' }} />
            <Typography variant="caption" color="white">
              Normal
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 2, backgroundColor: '#FFB800' }} />
            <Typography variant="caption" color="white">
              Degraded
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 2, backgroundColor: '#FF3366' }} />
            <Typography variant="caption" color="white">
              Broken
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default RealtimeTunisiaMap;
