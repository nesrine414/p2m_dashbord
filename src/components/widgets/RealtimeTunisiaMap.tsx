import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { BackendFiberRoute, BackendRTU } from '../../services/api';
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

const getNodeColor = (status: RTUStatus) => {
  switch (status) {
    case RTUStatus.ONLINE: return '#00FF88';
    case RTUStatus.UNREACHABLE: return '#FF3366';
    default: return '#FF3366';
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
  loading?: boolean;
}

interface RouteSegment {
  id: string | number;
  status: FiberStatus;
  positions: Array<[number, number]>;
  layer: 'backbone' | 'fiber' | 'manual' | 'fallback';
  routeName?: string;
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

const isNonNullable = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

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
    .map((v) => normalizeKey(v))
    .filter((v): v is string => Boolean(v))
    .forEach((v) => aliases.add(v));
  return Array.from(aliases);
};

const findNodeByAlias = (alias: string | null | undefined, nodes: RtuNode[]): RtuNode | null => {
  const key = normalizeKey(alias);
  if (!key) return null;
  return (
    nodes.find((node) =>
      createNodeAliases(node).some(
        (candidate) => candidate === key || candidate.includes(key) || key.includes(candidate)
      )
    ) || null
  );
};

const buildCurvedRoutePath = (from: RtuNode, to: RtuNode, _seed: string): LatLon[] => {
  return [
    [from.lat, from.lon],
    [to.lat, to.lon],
  ];
};

const smoothRoutePath = (positions: Array<[number, number]>, segments = 16): Array<[number, number]> => {
  if (positions.length !== 3) return positions;
  const [start, control, end] = positions;
  const samples: Array<[number, number]> = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const oneMinusT = 1 - t;
    const lat = oneMinusT * oneMinusT * start[0] + 2 * oneMinusT * t * control[0] + t * t * end[0];
    const lon = oneMinusT * oneMinusT * start[1] + 2 * oneMinusT * t * control[1] + t * t * end[1];
    samples.push([Number(lat.toFixed(6)), Number(lon.toFixed(6))]);
  }
  return samples;
};

const buildRoutePathThroughNodes = (nodes: RtuNode[], seed: string): LatLon[] => {
  const filteredNodes = nodes.filter(isNonNullable);
  if (filteredNodes.length < 2) return filteredNodes.map((node) => [node.lat, node.lon]);
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
    case FiberStatus.BROKEN: return '#ff8fa8';
    case FiberStatus.DEGRADED: return '#ffd27a';
    default: return '#93dbff';
  }
};

const getRouteStatusLabel = (status: FiberStatus) => {
  switch (status) {
    case FiberStatus.BROKEN: return 'Coupée';
    case FiberStatus.DEGRADED: return 'Dégradée';
    default: return 'Normale';
  }
};

const formatRouteMetric = (value?: number | null, suffix = '') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}${suffix}`;
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
  const lengthLabel = formatRouteMetric(route.lengthKm, ' km');
  const attenuationLabel = formatRouteMetric(route.attenuationDb, ' dB');

  if (mode === 'compact') {
    return (
      <Box sx={{ minWidth: 190, maxWidth: 260, p: 0.5 }}>
        <Typography variant="caption" fontWeight={800} display="block" sx={{ color: '#1a1a1a' }}>{title}</Typography>
        <Typography variant="caption" display="block" sx={{ color: '#666' }}>{source} → {destination}</Typography>
        <Typography variant="caption" display="block" sx={{ color: accentColor, fontWeight: 800, mt: 0.4 }}>{statusLabel} • {lengthLabel} • {attenuationLabel}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 260, maxWidth: 320, p: 0.5 }}>
      <Box sx={{ borderRadius: 2, p: 1.25, background: 'linear-gradient(135deg, #f8f9fa, #ffffff)', border: '1px solid #ddd', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={800} color="primary" lineHeight={1.2}>{title}</Typography>
        <Typography variant="caption" display="block" sx={{ color: '#666', mt: 0.35 }}>{statusLabel}</Typography>
      </Box>
      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.7, borderRadius: 1.5, backgroundColor: '#f5f5f5', border: '1px solid #eee' }}>
          <Typography variant="caption" sx={{ color: '#444', fontWeight: 600 }}>Distance</Typography>
          <Typography variant="caption" sx={{ color: '#000', fontWeight: 700 }}>{lengthLabel}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.7, borderRadius: 1.5, backgroundColor: '#f5f5f5', border: '1px solid #eee' }}>
          <Typography variant="caption" sx={{ color: '#444', fontWeight: 600 }}>Atténuation</Typography>
          <Typography variant="caption" sx={{ color: '#000', fontWeight: 700 }}>{attenuationLabel}</Typography>
        </Box>
      </Stack>
    </Box>
  );
};

const FitBounds: React.FC<{ bounds: Bounds | null }> = ({ bounds }) => {
  const map = useMap();
  const lastBounds = useRef<string>('');
  useEffect(() => {
    if (!bounds || !map || !map.getContainer()) return;
    const key = JSON.stringify(bounds);
    if (key === lastBounds.current) return;
    lastBounds.current = key;
    try { map.fitBounds(bounds, { padding: [24, 24], maxZoom: 9 }); } catch (e) { console.warn('Leaflet fitBounds failed', e); }
  }, [bounds, map]);
  return null;
};

const FocusRtu: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (!center || !map || !map.getContainer()) return;
    try { map.flyTo(center, 8.8, { animate: true, duration: 0.8 }); } catch (e) { console.warn('Leaflet flyTo failed', e); }
  }, [center, map]);
  return null;
};

const RealtimeTunisiaMap: React.FC<RealtimeTunisiaMapProps> = ({
  routes,
  rtus,
  loading = false,
}) => {
  const [selectedRtuId, setSelectedRtuId] = useState<string | null>(null);
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);

  const rtuNodes = useMemo<RtuNode[]>(() => {
    if (!rtus || rtus.length === 0) return [];
    return rtus.map((rtu) => {
        const lat = parseCoordinate(rtu.locationLatitude);
        const lon = parseCoordinate(rtu.locationLongitude);
        if (lat === null || lon === null) return null;
        return { id: `rtu-${rtu.id}`, city: rtu.locationAddress || rtu.name, name: rtu.name, status: toRtuStatus(rtu.status), lat, lon };
    }).filter(isNonNullable);
  }, [rtus]);

  const displayNodes = useMemo<RtuNode[]>(
    () => (loading && rtuNodes.length === 0 ? [] : (rtuNodes.length > 0 ? rtuNodes : BASE_NODES)),
    [loading, rtuNodes]
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

  const displayRoutes = useMemo<RouteSegment[]>(() => {
    if (loading && (!routes || routes.length === 0)) return [];
    if (!routes || routes.length === 0) return [];
    return routes.map(route => {
        const status = toFiberStatus(route.fiberStatus);
        const rawPath = Array.isArray(route.path) ? route.path : null;
        let positions: [number, number][] = [];
        if (rawPath && rawPath.length >= 2) {
            positions = rawPath.map(pair => [parseCoordinate(pair?.[0])!, parseCoordinate(pair?.[1])!]).filter(p => p[0] !== null);
        } else {
            const fromKey = normalizeKey(route.source);
            const toKey = normalizeKey(route.destination);
            const from = fromKey ? nodeMap.get(fromKey) : undefined;
            const to = toKey ? nodeMap.get(toKey) : undefined;
            if (from && to) positions = [[from.lat, from.lon], [to.lat, to.lon]];
        }
        if (positions.length < 2) return null;
        return { id: route.id, status, layer: 'fiber', positions, routeName: route.routeName, source: route.source, destination: route.destination, lengthKm: route.lengthKm, attenuationDb: route.attenuationDb, reflectionEvents: route.reflectionEvents, lastTestTime: route.lastTestTime };
    }).filter(isNonNullable);
  }, [routes, loading, nodeMap]);

  const backboneSegments = useMemo<RouteSegment[]>(() => {
    const topology = backboneRoutesData as any[];
    if (!Array.isArray(topology)) return [];
    return topology.map((route, index) => {
        const from = findNodeByAlias(route.from, displayNodes);
        const to = findNodeByAlias(route.to, displayNodes);
        if (!from || !to) return null;
        const viaNodes = Array.isArray(route.via) ? route.via.map(v => findNodeByAlias(v, displayNodes)).filter(isNonNullable) : [];
        const routeNodes = [from, ...viaNodes, to];
        return { id: route.id || `backbone-${index}`, status: toFiberStatus(route.status), layer: 'backbone', routeName: route.routeName || `${route.from}-${route.to}`, source: route.from, destination: route.to, positions: buildRoutePathThroughNodes(routeNodes, route.id || route.routeName || `${index}`) };
      }).filter(isNonNullable);
  }, [displayNodes]);

  const connectedRouteIds = useMemo<Set<string | number>>(() => {
    if (!selectedRtuId) return new Set();
    const selected = displayNodes.find((n) => n.id === selectedRtuId);
    if (!selected) return new Set();
    const selectedCityKey = normalizeKey(selected.city);
    const selectedNameKey = normalizeKey(selected.name);
    const ids = new Set<string | number>();
    [...backboneSegments, ...displayRoutes].forEach((route) => {
      const srcKey = normalizeKey(route.source);
      const dstKey = normalizeKey(route.destination);
      if ((srcKey && (srcKey === selectedCityKey || srcKey === selectedNameKey)) || (dstKey && (dstKey === selectedCityKey || dstKey === selectedNameKey))) { ids.add(route.id); }
    });
    return ids;
  }, [backboneSegments, selectedRtuId, displayNodes, displayRoutes]);

  const handleRtuClick = (node: RtuNode) => {
    if (selectedRtuId === node.id) { setSelectedRtuId(null); setFocusCenter(null); } 
    else { setSelectedRtuId(node.id); setFocusCenter([node.lat, node.lon]); }
  };

  const bounds = useMemo<Bounds | null>(() => {
    if (displayNodes.length === 0) return null;
    const lats = displayNodes.map((node) => node.lat);
    const lons = displayNodes.map((node) => node.lon);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  }, [displayNodes]);

  const selectedNode = selectedRtuId ? displayNodes.find(n => n.id === selectedRtuId) : null;
  const selectedRoutes = [...backboneSegments, ...displayRoutes].filter(r => connectedRouteIds.has(r.id));

  return (
    <Box sx={{ position: 'relative', height: '100%', borderRadius: 3, overflow: 'hidden' }}>
      <MapContainer center={[34.5, 9.6]} zoom={6.4} style={{ height: '100%', width: '100%' }}>
        <FitBounds bounds={selectedRtuId ? null : bounds} />
        <FocusRtu center={focusCenter} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {[...backboneSegments, ...displayRoutes].map((link) => {
          const isConnected = selectedRtuId ? connectedRouteIds.has(link.id) : true;
          if (selectedRtuId && !isConnected) return null;
          const color = link.layer === 'backbone' ? getBackboneColor(link.status) : getLinkColor(link.status);
          const weight = link.layer === 'backbone' ? 3 : 4;
          return (
            <Polyline key={link.id} positions={link.positions} pathOptions={{ color, weight, opacity: isConnected ? 0.9 : 0.2, dashArray: getLinkDash(link.status) }}>
                <Tooltip sticky><RouteInfoCard route={link} mode="compact" accentColor={color} /></Tooltip>
                <Popup><RouteInfoCard route={link} mode="expanded" accentColor={color} /></Popup>
            </Polyline>
          );
        })}
        {displayNodes.map((node) => (
          <CircleMarker key={node.id} center={[node.lat, node.lon]} radius={selectedRtuId === node.id ? 10 : 7} pathOptions={{ color: getNodeColor(node.status), fillColor: getNodeColor(node.status), fillOpacity: 0.9, weight: selectedRtuId === node.id ? 3 : 1 }} eventHandlers={{ click: () => handleRtuClick(node) }}>
            <Tooltip direction="top"><strong>{node.city}</strong></Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {selectedNode && (
        <Box sx={{ position: 'absolute', right: 16, top: 16, width: 220, bgcolor: 'rgba(255,255,255,0.95)', p: 2, borderRadius: 2, boxShadow: 3, zIndex: 1000 }}>
          <Typography variant="subtitle2" fontWeight={800}>{selectedNode.city}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>Routes connectées ({selectedRoutes.length})</Typography>
          <Stack spacing={1}>
            {selectedRoutes.map(r => (
                <Box key={r.id} sx={{ p: 1, borderRadius: 1, bgcolor: '#f8f9fa', borderLeft: `3px solid ${getLinkColor(r.status)}` }}>
                    <Typography variant="caption" fontWeight={700} display="block">{r.routeName}</Typography>
                </Box>
            ))}
          </Stack>
          <Button size="small" onClick={() => setSelectedRtuId(null)} sx={{ mt: 1 }}>Fermer</Button>
        </Box>
      )}
    </Box>
  );
};

export default RealtimeTunisiaMap;
