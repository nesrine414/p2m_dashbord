import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { BackendFiberRoute, BackendRTU } from '../../services/api';
import manualRoutesData from '../../data/tunisiaRoutes.json';
import backboneRoutesData from '../../data/tunisiaBackbone.json';
import { FiberStatus, RTUStatus } from '../../types';
import { normalizeRtuStatus } from '../../utils/rtuStatus';

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
  { id: 'bizerte', city: 'Bizerte', name: 'Bizerte', status: RTUStatus.UNREACHABLE, lat: 37.2746, lon: 9.8739 },
  { id: 'nabeul', city: 'Nabeul', name: 'Nabeul', status: RTUStatus.ONLINE, lat: 36.4513, lon: 10.7353 },
  { id: 'sousse', city: 'Sousse', name: 'Sousse', status: RTUStatus.ONLINE, lat: 35.8256, lon: 10.636 },
  { id: 'monastir', city: 'Monastir', name: 'Monastir', status: RTUStatus.UNREACHABLE, lat: 35.7643, lon: 10.8113 },
  { id: 'sfax', city: 'Sfax', name: 'Sfax', status: RTUStatus.ONLINE, lat: 34.7398, lon: 10.76 },
  { id: 'kairouan', city: 'Kairouan', name: 'Kairouan', status: RTUStatus.ONLINE, lat: 35.6781, lon: 10.0963 },
  { id: 'gafsa', city: 'Gafsa', name: 'Gafsa', status: RTUStatus.UNREACHABLE, lat: 34.4311, lon: 8.7757 },
  { id: 'tozeur', city: 'Tozeur', name: 'Tozeur', status: RTUStatus.ONLINE, lat: 33.9197, lon: 8.1335 },
  { id: 'gabes', city: 'Gabes', name: 'Gabes', status: RTUStatus.ONLINE, lat: 33.8881, lon: 10.0972 },
  { id: 'medenine', city: 'Medenine', name: 'Medenine', status: RTUStatus.UNREACHABLE, lat: 33.3549, lon: 10.5055 },
  { id: 'djerba', city: 'Djerba', name: 'Djerba', status: RTUStatus.ONLINE, lat: 33.875, lon: 10.8575 },
  { id: 'tataouine', city: 'Tataouine', name: 'Tataouine', status: RTUStatus.OFFLINE, lat: 32.9297, lon: 10.4518 },
  { id: 'kasserine', city: 'Kasserine', name: 'Kasserine', status: RTUStatus.UNREACHABLE, lat: 35.1676, lon: 8.8365 },
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
    case RTUStatus.ONLINE: return '#00FF88';
    case RTUStatus.UNREACHABLE: return '#FF3366';
    default: return '#FF3366';
  }
};

const getStatusLabel = (status: RTUStatus) => {
  switch (status) {
    case RTUStatus.ONLINE: return 'En ligne';
    case RTUStatus.UNREACHABLE: return 'Injoignable';
    case RTUStatus.OFFLINE:
    default: return 'Hors ligne';
  }
};

const getLinkColor = (status: FiberStatus) => {
  switch (status) {
    case FiberStatus.BROKEN: return '#FF3366';
    case FiberStatus.DEGRADED: return '#FFB800';
    default: return '#5cc2ff';
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
  loading?: boolean;
}

interface RouteSegment {
  id: string | number;
  status: FiberStatus;
  positions: Array<[number, number]>;
  layer: 'backbone' | 'fiber' | 'manual' | 'fallback';
  routeName?: string;
  // Pour relier aux RTUs
  sourceRtuId?: number;
  destinationRtuId?: number;
  source?: string;
  destination?: string;
  lengthKm?: number | null;
  attenuationDb?: number | null;
  reflectionEvents?: boolean;
  lastTestTime?: string | Date | null;
}

type Bounds = [[number, number], [number, number]];
type LatLon = [number, number];
const BACKBONE_VISIBLE_ZOOM = 4.9;
const ROUTE_VISIBLE_ZOOM = 6.0;

const isNonNullable = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

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

interface BackboneRouteInput {
  id: string;
  routeName?: string;
  from: string;
  to: string;
  via?: string[];
  status?: FiberStatus | string;
}

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const toRtuStatus = (value?: string | null): RTUStatus => normalizeRtuStatus(value);

const toFiberStatus = (value?: string | null): FiberStatus => {
  switch (value) {
    case FiberStatus.BROKEN: return FiberStatus.BROKEN;
    case FiberStatus.DEGRADED: return FiberStatus.DEGRADED;
    case FiberStatus.NORMAL: return FiberStatus.NORMAL;
    default: return FiberStatus.NORMAL;
  }
};

const normalizeKey = (value?: string | null): string | null => {
  if (!value) return null;
  return value.trim().toLowerCase();
};

const createNodeAliases = (node: RtuNode): string[] => {
  const aliases = new Set<string>();

  [node.id, node.city, node.name || '']
    .map((value) => normalizeKey(value))
    .filter((value): value is string => Boolean(value))
    .forEach((value) => aliases.add(value));

  return Array.from(aliases);
};

const findNodeByAlias = (alias: string | null | undefined, nodes: RtuNode[]): RtuNode | null => {
  const key = normalizeKey(alias);
  if (!key) {
    return null;
  }

  return (
    nodes.find((node) =>
      createNodeAliases(node).some(
        (candidate) => candidate === key || candidate.includes(key) || key.includes(candidate)
      )
    ) || null
  );
};

const buildCurvedRoutePath = (from: RtuNode, to: RtuNode, seed: string): LatLon[] => {
  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;
  const distance = Math.hypot(dx, dy) || 0.001;
  const midLat = (from.lat + to.lat) / 2;
  const midLon = (from.lon + to.lon) / 2;
  const bend = Math.max(0.02, Math.min(0.08, distance * 0.075));
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const direction = hash % 2 === 0 ? 1 : -1;
  const controlLat = midLat + ((-dx / distance) * bend * direction);
  const controlLon = midLon + ((dy / distance) * bend * direction);

  return [
    [from.lat, from.lon],
    [Number(controlLat.toFixed(6)), Number(controlLon.toFixed(6))],
    [to.lat, to.lon],
  ];
};

const smoothRoutePath = (positions: Array<[number, number]>, segments = 16): Array<[number, number]> => {
  if (positions.length !== 3) {
    return positions;
  }

  const [start, control, end] = positions;
  const samples: Array<[number, number]> = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const oneMinusT = 1 - t;
    const lat =
      oneMinusT * oneMinusT * start[0] +
      2 * oneMinusT * t * control[0] +
      t * t * end[0];
    const lon =
      oneMinusT * oneMinusT * start[1] +
      2 * oneMinusT * t * control[1] +
      t * t * end[1];

    samples.push([Number(lat.toFixed(6)), Number(lon.toFixed(6))]);
  }

  return samples;
};

const buildRoutePathThroughNodes = (nodes: RtuNode[], seed: string): LatLon[] => {
  const filteredNodes = nodes.filter(isNonNullable);
  if (filteredNodes.length < 2) {
    return filteredNodes.map((node) => [node.lat, node.lon]);
  }

  const path: LatLon[] = [];

  filteredNodes.slice(0, -1).forEach((from, index) => {
    const to = filteredNodes[index + 1];
    const segmentSeed = `${seed}-${index}`;
    const segment = smoothRoutePath(buildCurvedRoutePath(from, to, segmentSeed));
    const points = path.length > 0 ? segment.slice(1) : segment;
    path.push(...points);
  });

  return path;
};

const getBackboneColor = (status: FiberStatus) => {
  switch (status) {
    case FiberStatus.BROKEN:
      return '#ff8fa8';
    case FiberStatus.DEGRADED:
      return '#ffd27a';
    default:
      return '#93dbff';
  }
};

const getRouteLayerLabel = (layer: RouteSegment['layer']) => {
  switch (layer) {
    case 'backbone':
      return 'Dorsale';
    case 'manual':
      return 'Route manuelle';
    case 'fallback':
      return 'Fallback';
    default:
      return 'Fibre';
  }
};

const getRouteStatusLabel = (status: FiberStatus) => {
  switch (status) {
    case FiberStatus.BROKEN:
      return 'Cassée';
    case FiberStatus.DEGRADED:
      return 'Dégradée';
    default:
      return 'Normale';
  }
};

const formatRouteMetric = (value?: number | null, suffix = '') => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(1)}${suffix}`;
};

const formatRouteTimestamp = (value?: string | Date | null) => {
  if (!value) {
    return 'N/A';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const RouteInfoCard: React.FC<{
  route: RouteSegment;
  mode: 'compact' | 'expanded';
  accentColor: string;
}> = ({ route, mode, accentColor }) => {
  const title = route.routeName || `Route ${route.id}`;
  const source = route.source || 'N/A';
  const destination = route.destination || 'N/A';
  const statusLabel = getRouteStatusLabel(route.status);
  const layerLabel = getRouteLayerLabel(route.layer);
  const lengthLabel = formatRouteMetric(route.lengthKm, ' km');
  const attenuationLabel = formatRouteMetric(route.attenuationDb, ' dB');
  const reflectionLabel =
    typeof route.reflectionEvents === 'boolean'
      ? route.reflectionEvents
        ? 'Présentes'
        : 'Aucune'
      : 'N/A';
  const lastTestLabel = formatRouteTimestamp(route.lastTestTime);

  if (mode === 'compact') {
    return (
      <Box sx={{ minWidth: 190, maxWidth: 260 }}>
        <Typography variant="caption" fontWeight={800} display="block" sx={{ color: '#ffffff' }}>
          {title}
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(238,244,255,0.72)' }}>
          {source} → {destination}
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: accentColor, fontWeight: 700, mt: 0.4 }}>
          {statusLabel} • {lengthLabel} • {attenuationLabel}
        </Typography>
      </Box>
    );
  }

  const rows = [
    { label: 'Source', value: source },
    { label: 'Destination', value: destination },
    { label: 'Length', value: lengthLabel },
    { label: 'Loss', value: attenuationLabel },
    { label: 'Reflection', value: reflectionLabel },
    { label: 'Last test', value: lastTestLabel },
  ];

  return (
    <Box sx={{ minWidth: 260, maxWidth: 320 }}>
      <Box
        sx={{
          borderRadius: 2,
          p: 1.25,
          background: 'linear-gradient(135deg, rgba(124,223,255,0.16), rgba(11,16,31,0.98))',
          border: '1px solid rgba(124,223,255,0.22)',
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} color="white" lineHeight={1.2}>
          {title}
        </Typography>
        <Typography variant="caption" display="block" sx={{ color: 'rgba(238,244,255,0.74)', mt: 0.35 }}>
          {layerLabel} • {statusLabel}
        </Typography>
      </Box>

      <Stack spacing={0.75} sx={{ mt: 1.1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(238,244,255,0.62)' }}>
            Status
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.35,
              borderRadius: 999,
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}`,
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {statusLabel}
          </Box>
        </Box>

        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              px: 1,
              py: 0.7,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(238,244,255,0.58)' }}>
              {row.label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600, textAlign: 'right' }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};


// ─── ZoomTracker : surveille le niveau de zoom ────────────────────────────
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map, onZoomChange]);
  return null;
};

// ─── FitBounds : zoom automatique sur les bounds ───────────────────────────
const FitBounds: React.FC<{ bounds: Bounds | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 9 });
  }, [bounds, map]);
  return null;
};

// ─── FocusRtu : zoom sur la RTU sélectionnée ──────────────────────────────
const FocusRtu: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, 8.8, { animate: true, duration: 0.8 });
  }, [center, map]);
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

// ─── Composant principal ───────────────────────────────────────────────────
const RealtimeTunisiaMap: React.FC<RealtimeTunisiaMapProps> = ({
  routes,
  rtus,
  enableEditor = false,
  loading = false,
}) => {
  // ─── État zoom courant ─────────────────────────────────────────────────
  const [currentZoom, setCurrentZoom] = useState<number>(6);

  // ─── État sélection RTU ─────────────────────────────────────────────────
  const [selectedRtuId, setSelectedRtuId] = useState<string | null>(null);
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);

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
  const displayNodes = useMemo<RtuNode[]>(
    () => {
      if (loading) {
        return [];
      }

      return hasRealtimeNodes ? rtuNodes : BASE_NODES;
    },
    [hasRealtimeNodes, loading, rtuNodes]
  );

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
      segments.push({
        id: route.id,
        status,
        layer: 'fiber',
        positions,
        routeName: route.routeName,
        sourceRtuId: route.sourceRtuId ?? undefined,
        destinationRtuId: route.destinationRtuId ?? undefined,
        source: route.source,
        destination: route.destination,
        lengthKm: route.lengthKm ?? null,
        attenuationDb: route.attenuationDb ?? null,
        reflectionEvents: route.reflectionEvents,
        lastTestTime: route.lastTestTime ?? null,
      });
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
        layer: 'fiber',
        routeName: route.routeName,
        sourceRtuId: route.sourceRtuId ?? undefined,
        destinationRtuId: route.destinationRtuId ?? undefined,
        source: route.source,
        destination: route.destination,
        lengthKm: route.lengthKm ?? null,
        attenuationDb: route.attenuationDb ?? null,
        reflectionEvents: route.reflectionEvents,
        lastTestTime: route.lastTestTime ?? null,
        positions: [[from.lat, from.lon], [to.lat, to.lon]],
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
          layer: 'manual',
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
        layer: 'fallback',
        source: link.from,
        destination: link.to,
        positions: [[from.lat, from.lon], [to.lat, to.lon]],
      };
    }).filter(isNonNullable);
  }, []);

  const displayRoutes = useMemo(() => {
    if (loading) return [];
    if (manualSegments.length > 0 && backendPathSegments.length === 0) return manualSegments;
    if (backendPathSegments.length > 0) return backendPathSegments;
    if (backendEndpointSegments.length > 0) return backendEndpointSegments;
    if (manualSegments.length > 0) return manualSegments;
    if (hasRealtimeNodes) return [];
    return fallbackRoutes;
  }, [backendEndpointSegments, backendPathSegments, fallbackRoutes, hasRealtimeNodes, loading, manualSegments]);

  const backboneSegments = useMemo<RouteSegment[]>(() => {
    const topology = backboneRoutesData as BackboneRouteInput[];
    if (!Array.isArray(topology)) return [];

    return topology
      .map<RouteSegment | null>((route, index) => {
        const from = findNodeByAlias(route.from, displayNodes);
        const to = findNodeByAlias(route.to, displayNodes);
        if (!from || !to) return null;
        const viaNodes = Array.isArray(route.via)
          ? route.via
              .map((viaAlias) => findNodeByAlias(viaAlias, displayNodes))
              .filter(isNonNullable)
          : [];
        const routeNodes = [from, ...viaNodes, to];

        return {
          id: route.id || `backbone-${index}`,
          status: toFiberStatus(route.status),
          layer: 'backbone',
          routeName: route.routeName || `${route.from}-${route.to}`,
          source: route.from,
          destination: route.to,
          positions: buildRoutePathThroughNodes(routeNodes, route.id || route.routeName || `${index}`),
        };
      })
      .filter(isNonNullable);
  }, [displayNodes]);

  // ─── Filtrage des routes liées à la RTU sélectionnée ───────────────────
  const connectedRouteIds = useMemo<Set<string | number>>(() => {
    if (!selectedRtuId) return new Set();
    const selected = displayNodes.find((n) => n.id === selectedRtuId);
    if (!selected) return new Set();

    const selectedCityKey = normalizeKey(selected.city);
    const selectedNameKey = normalizeKey(selected.name);
    const selectedRtuNumId = selectedRtuId.replace('rtu-', '');

    const ids = new Set<string | number>();
    [...backboneSegments, ...displayRoutes].forEach((route) => {
      const srcKey = normalizeKey(route.source);
      const dstKey = normalizeKey(route.destination);
      const matchByName =
        (srcKey && (srcKey === selectedCityKey || srcKey === selectedNameKey)) ||
        (dstKey && (dstKey === selectedCityKey || dstKey === selectedNameKey));
      const matchById =
        route.sourceRtuId?.toString() === selectedRtuNumId ||
        route.destinationRtuId?.toString() === selectedRtuNumId;

      if (matchByName || matchById) ids.add(route.id);
    });
    return ids;
  }, [backboneSegments, selectedRtuId, displayNodes, displayRoutes]);

  // ─── Infos panneau latéral ──────────────────────────────────────────────
  const selectedNode = useMemo(
    () => (selectedRtuId ? displayNodes.find((n) => n.id === selectedRtuId) ?? null : null),
    [selectedRtuId, displayNodes]
  );

  const selectedRoutes = useMemo(
    () => [...backboneSegments, ...displayRoutes].filter((r) => connectedRouteIds.has(r.id)),
    [backboneSegments, displayRoutes, connectedRouteIds]
  );

  // ─── Clic sur une RTU ──────────────────────────────────────────────────
  const handleRtuClick = (node: RtuNode) => {
    if (selectedRtuId === node.id) {
      // Désélectionner si déjà sélectionné
      setSelectedRtuId(null);
      setFocusCenter(null);
    } else {
      setSelectedRtuId(node.id);
      setFocusCenter([node.lat, node.lon]);
    }
  };

  const bounds = useMemo<Bounds | null>(() => {
    if (displayNodes.length === 0) return null;
    const lats = displayNodes.map((node) => node.lat);
    const lons = displayNodes.map((node) => node.lon);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
  }, [displayNodes]);

  const showMissingCoords = !hasRealtimeNodes && (rtus?.length || 0) > 0;
  const showMissingRoutes =
    hasRealtimeNodes && (routes?.length || 0) > 0 && displayRoutes.length === 0;
  const showManualRoutes = manualSegments.length > 0;
  const showBackboneLayer =
    Boolean(selectedRtuId) || backboneSegments.length > 0 || displayRoutes.length > 0;
  const showFiberLayer = Boolean(selectedRtuId) || displayRoutes.length > 0;

  

  // ─── Éditeur ────────────────────────────────────────────────────────────
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
      if (Array.isArray(parsed)) setEditorRoutes(parsed);
    } catch { /* ignore */ }
  }, [enableEditor]);

  useEffect(() => {
    if (!enableEditor) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editorRoutes));
  }, [editorRoutes, enableEditor]);

  const exportJson = useMemo(
    () => JSON.stringify(
      editorRoutes.map((r) => ({ routeName: r.routeName, fiberStatus: r.fiberStatus, path: r.path })),
      null, 2
    ),
    [editorRoutes]
  );

  const onAddPoint = (point: LatLon) => setDraftPoints((c) => [...c, point]);
  const onUndoPoint = () => setDraftPoints((c) => c.slice(0, -1));
  const onClearDraft = () => setDraftPoints([]);

  const onSaveRoute = () => {
    const trimmed = routeName.trim();
    if (!trimmed || draftPoints.length < 2) return;
    setEditorRoutes((c) => [
      { id: `${Date.now()}`, routeName: trimmed, fiberStatus: routeStatus, path: [...draftPoints] },
      ...c,
    ]);
    setDraftPoints([]);
    setRouteName('');
    setIsDrawing(false);
  };

  const onDeleteRoute = (id: string) =>
    setEditorRoutes((c) => c.filter((r) => r.id !== id));

  const onCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { setCopied(false); }
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
    } catch { /* ignore */ }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ position: 'relative', height: 420, borderRadius: 3, overflow: 'hidden' }}>
      <MapContainer
        center={[34.5, 9.6]}
        zoom={6.4}
        minZoom={5}
        maxZoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <FitBounds bounds={selectedRtuId ? null : bounds} />
        <FocusRtu center={focusCenter} />
        <ZoomTracker onZoomChange={setCurrentZoom} />
        {enableEditor && <EditorClickHandler active={isDrawing} onAddPoint={onAddPoint} />}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Backbone visible à zoom moyen */}
        {showBackboneLayer && backboneSegments.map((link) => {
          const isConnected = selectedRtuId ? connectedRouteIds.has(link.id) : true;
          if (selectedRtuId && !isConnected) return null;
          const zoomBoost = Math.max(0, currentZoom - BACKBONE_VISIBLE_ZOOM);
          const routeWeight = Math.min(5.6, 2.4 + zoomBoost * 0.55);
          const routeOpacity = selectedRtuId
            ? 0.95
            : Math.min(0.76, 0.32 + zoomBoost * 0.08);
          const routeColor = getBackboneColor(link.status);
          const renderPositions = smoothRoutePath(link.positions);

          return (
            <React.Fragment key={link.id}>
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: 'rgba(255,255,255,0.12)',
                  weight: routeWeight + 2.0,
                  opacity: routeOpacity * 0.5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: routeColor,
                  weight: routeWeight,
                  dashArray: getLinkDash(link.status),
                  opacity: routeOpacity,
                  lineCap: 'round',
                  lineJoin: 'round',
                  className: 'rtu-route-hit-area rtu-route-hit-area--backbone',
                }}
              >
                <Tooltip sticky direction="top" opacity={1} className="rtu-route-tooltip rtu-route-tooltip--backbone">
                  <RouteInfoCard route={link} mode="compact" accentColor={routeColor} />
                </Tooltip>
                <Popup className="rtu-route-popup rtu-route-popup--backbone" closeButton autoPanPadding={[18, 18]}>
                  <RouteInfoCard route={link} mode="expanded" accentColor={routeColor} />
                </Popup>
              </Polyline>
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: routeColor,
                  weight: Math.max(1.15, routeWeight * 0.35),
                  dashArray: '10 18',
                  opacity: Math.max(0.16, routeOpacity * 0.5),
                  lineCap: 'round',
                  lineJoin: 'round',
                  className: `rtu-route-flow rtu-route-flow--backbone rtu-route-flow--${link.status}`,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Fibres locales visibles à zoom plus fort */}
        {showFiberLayer && displayRoutes.map((link) => {
          const isConnected = selectedRtuId ? connectedRouteIds.has(link.id) : true;
          if (selectedRtuId && !isConnected) return null;
          const zoomBoost = Math.max(0, currentZoom - ROUTE_VISIBLE_ZOOM);
          const baseWeight = isConnected ? 3.5 : 2;
          const routeWeight = Math.min(6.8, baseWeight + zoomBoost * 0.9);
          const routeOpacity = selectedRtuId
            ? 0.98
            : Math.min(0.96, 0.45 + zoomBoost * 0.12);
          const renderPositions = smoothRoutePath(link.positions);
          return (
            <React.Fragment key={link.id}>
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: 'rgba(255,255,255,0.10)',
                  weight: routeWeight + 2.2,
                  opacity: routeOpacity * 0.55,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: isConnected ? getLinkColor(link.status) : 'rgba(100,120,150,0.35)',
                  weight: routeWeight,
                  dashArray: isConnected ? getLinkDash(link.status) : undefined,
                  opacity: routeOpacity,
                  lineCap: 'round',
                  lineJoin: 'round',
                  className: 'rtu-route-hit-area rtu-route-hit-area--fiber',
                }}
              >
                <Tooltip sticky direction="top" opacity={1} className="rtu-route-tooltip rtu-route-tooltip--fiber">
                  <RouteInfoCard route={link} mode="compact" accentColor={getLinkColor(link.status)} />
                </Tooltip>
                <Popup className="rtu-route-popup rtu-route-popup--fiber" closeButton autoPanPadding={[18, 18]}>
                  <RouteInfoCard route={link} mode="expanded" accentColor={getLinkColor(link.status)} />
                </Popup>
              </Polyline>
              <Polyline
                positions={renderPositions}
                pathOptions={{
                  color: isConnected ? getLinkColor(link.status) : 'rgba(120,135,160,0.22)',
                  weight: Math.max(1.1, routeWeight * 0.32),
                  dashArray: '10 16',
                  opacity: selectedRtuId ? 0.8 : 0.42,
                  lineCap: 'round',
                  lineJoin: 'round',
                  className: `rtu-route-flow rtu-route-flow--fiber rtu-route-flow--${link.status}`,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Routes éditeur */}
        {editorRoutes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{ color: getLinkColor(route.fiberStatus), weight: 4, opacity: 0.9 }}
          />
        ))}

        {/* Draft éditeur */}
        {draftPoints.length >= 2 && (
          <Polyline
            positions={draftPoints}
            pathOptions={{ color: '#ffffff', weight: 3, dashArray: '6 6', opacity: 0.9 }}
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

        {/* Noeuds RTU */}
        {displayNodes.map((node) => {
          const isSelected = selectedRtuId === node.id;
          return (
            <React.Fragment key={node.id}>
              <CircleMarker
                center={[node.lat, node.lon]}
                radius={isSelected ? 13 : 9}
                pathOptions={{
                  color: getNodeColor(node.status),
                  fillColor: getNodeColor(node.status),
                  fillOpacity: isSelected ? 0.18 : 0.12,
                  weight: 0,
                }}
              />
            <CircleMarker
              center={[node.lat, node.lon]}
              radius={isSelected ? 9 : 6}
              pathOptions={{
                color: isSelected ? '#ffffff' : getNodeColor(node.status),
                fillColor: getNodeColor(node.status),
                fillOpacity: 0.96,
                weight: isSelected ? 2.5 : 1,
              }}
              eventHandlers={{ click: () => handleRtuClick(node) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                <strong>{node.city}</strong> — {getStatusLabel(node.status)}
                <br />
                <span style={{ fontSize: 11, opacity: 0.8 }}>Cliquer pour voir les fibres</span>
              </Tooltip>
            </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* ─── Bandeau titre ──────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'absolute', left: 16, top: 16,
          px: 1.4, py: 0.6, borderRadius: 2,
          backgroundColor: 'rgba(12, 18, 33, 0.82)',
          border: '1px solid rgba(156, 176, 217, 0.28)',
          color: 'white',
        }}
      >
        <Typography variant="caption" fontWeight={700}>
          Tunisia RTU Live Map
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Zoom {currentZoom < ROUTE_VISIBLE_ZOOM
            ? `actuel : ${currentZoom} — zoomez un peu pour voir les fibres`
            : `${currentZoom} — fibres visibles`}
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
              : 'Route geometry missing.'}
          </Typography>
        )}
        {selectedRtuId && (
          <Typography variant="caption" sx={{ color: '#00FF88' }} display="block">
            {selectedNode?.city} - {selectedRoutes.length} connexion(s) visible(s)
          </Typography>
        )}
      </Box>

      {/* ─── Panneau infos RTU sélectionnée ─────────────────────────────── */}
      {selectedNode && (
        <Box
          sx={{
            position: 'absolute', right: 16, top: 16,
            width: 220,
            backgroundColor: 'rgba(12, 18, 33, 0.90)',
            border: '1px solid rgba(156, 176, 217, 0.28)',
            borderRadius: 2, p: 1.4,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.8}>
            <Typography variant="caption" fontWeight={700} color="white">
              {selectedNode.city}
            </Typography>
            <Box
              onClick={() => { setSelectedRtuId(null); setFocusCenter(null); }}
              sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1 }}
            >
              ✕
            </Box>
          </Stack>

          <Typography variant="caption" display="block" sx={{ color: getNodeColor(selectedNode.status), mb: 1 }}>
            {getStatusLabel(selectedNode.status)}
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" mb={0.6}>
            Connexions réseau ({selectedRoutes.length})
          </Typography>

          <Stack spacing={0.6}>
            {selectedRoutes.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Aucune route trouvée.
              </Typography>
            )}
            {selectedRoutes.map((route) => (
              <Box
                key={route.id}
                sx={{
                  px: 1, py: 0.5, borderRadius: 1,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${getLinkColor(route.status)}`,
                }}
              >
                <Typography variant="caption" color="white" fontWeight={600} display="block">
                  {route.routeName ?? `Route ${route.id}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {route.layer === 'backbone' ? 'Dorsale' : 'Fibre'} - {route.status}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Button
            size="small"
            variant="text"
            onClick={() => { setSelectedRtuId(null); setFocusCenter(null); }}
            sx={{ mt: 1, color: 'rgba(255,255,255,0.45)', px: 0, fontSize: 11 }}
          >
            Tout afficher
          </Button>
        </Box>
      )}

      {/* ─── Légende (cachée quand panneau RTU ouvert) ──────────────────── */}
      {!selectedNode && (
        <Box sx={{ position: 'absolute', right: 16, bottom: 16 }}>
          <Stack spacing={0.6} sx={{ backgroundColor: 'rgba(12, 18, 33, 0.75)', p: 1.2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Fiber status legend
            </Typography>
            {[
              { color: '#5cc2ff', label: 'Normal' },
              { color: '#FFB800', label: 'Degraded' },
              { color: '#FF3366', label: 'Broken' },
            ].map(({ color, label }) => (
              <Stack key={label} direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 2, backgroundColor: color }} />
                <Typography variant="caption" color="white">{label}</Typography>
              </Stack>
            ))}
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 12, height: 2, backgroundColor: '#7dd3fc' }} />
              <Typography variant="caption" color="white">Dorsale</Typography>
            </Stack>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              Cliquer sur une RTU pour voir ses fibres
            </Typography>
          </Stack>
        </Box>
      )}

      {/* ─── Éditeur ────────────────────────────────────────────────────── */}
      {enableEditor && (
        <Box
          sx={{
            position: 'absolute', left: 16, bottom: 16,
            width: 300, maxHeight: '70%', overflow: 'auto',
            backgroundColor: 'rgba(12, 18, 33, 0.88)',
            border: '1px solid rgba(156, 176, 217, 0.28)',
            borderRadius: 2, p: 1.4,
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
              size="small" label="Route name" value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              error={Boolean(routeName) && routeName.trim().length === 0}
              helperText={routeName.trim().length === 0 ? 'Route name required.' : ' '}
            />
            <FormControl size="small">
              <InputLabel id="fiber-status-label">Fiber status</InputLabel>
              <Select
                labelId="fiber-status-label" value={routeStatus} label="Fiber status"
                onChange={(e) => setRouteStatus(e.target.value as FiberStatus)}
              >
                <MenuItem value={FiberStatus.NORMAL}>Normal</MenuItem>
                <MenuItem value={FiberStatus.DEGRADED}>Degraded</MenuItem>
                <MenuItem value={FiberStatus.BROKEN}>Broken</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button variant={isDrawing ? 'contained' : 'outlined'} onClick={() => setIsDrawing((c) => !c)} fullWidth>
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
                variant="contained" onClick={onSaveRoute}
                disabled={routeName.trim().length === 0 || draftPoints.length < 2} fullWidth
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
              <Box key={route.id} sx={{ p: 0.8, borderRadius: 1.4, backgroundColor: 'rgba(25,32,48,0.9)' }}>
                <Typography variant="caption" color="white" fontWeight={600} display="block">
                  {route.routeName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {route.path.length} points — {route.fiberStatus}
                </Typography>
                <Button size="small" variant="text" onClick={() => onDeleteRoute(route.id)} sx={{ color: '#ff8d9a', px: 0 }}>
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Stack spacing={0.8}>
            <TextField label="Export JSON" value={exportJson} multiline minRows={4} maxRows={8} size="small" InputProps={{ readOnly: true }} />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onCopyJson} fullWidth>{copied ? 'Copied' : 'Copy JSON'}</Button>
              <Button variant="outlined" onClick={onDownloadJson} fullWidth>Download</Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default RealtimeTunisiaMap;
