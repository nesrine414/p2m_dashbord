import React, { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { FiberStatus, RTUStatus } from '../../types';

interface RtuNode {
  id: string;
  city: string;
  status: RTUStatus;
  baseLat: number;
  baseLon: number;
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
  { id: 'tunis', city: 'Tunis', status: RTUStatus.ONLINE, baseLat: 36.8065, baseLon: 10.1815, lat: 36.8065, lon: 10.1815 },
  { id: 'bizerte', city: 'Bizerte', status: RTUStatus.WARNING, baseLat: 37.2746, baseLon: 9.8739, lat: 37.2746, lon: 9.8739 },
  { id: 'nabeul', city: 'Nabeul', status: RTUStatus.ONLINE, baseLat: 36.4513, baseLon: 10.7353, lat: 36.4513, lon: 10.7353 },
  { id: 'sousse', city: 'Sousse', status: RTUStatus.ONLINE, baseLat: 35.8256, baseLon: 10.6360, lat: 35.8256, lon: 10.6360 },
  { id: 'monastir', city: 'Monastir', status: RTUStatus.WARNING, baseLat: 35.7643, baseLon: 10.8113, lat: 35.7643, lon: 10.8113 },
  { id: 'sfax', city: 'Sfax', status: RTUStatus.ONLINE, baseLat: 34.7398, baseLon: 10.7600, lat: 34.7398, lon: 10.7600 },
  { id: 'kairouan', city: 'Kairouan', status: RTUStatus.ONLINE, baseLat: 35.6781, baseLon: 10.0963, lat: 35.6781, lon: 10.0963 },
  { id: 'gafsa', city: 'Gafsa', status: RTUStatus.WARNING, baseLat: 34.4311, baseLon: 8.7757, lat: 34.4311, lon: 8.7757 },
  { id: 'tozeur', city: 'Tozeur', status: RTUStatus.ONLINE, baseLat: 33.9197, baseLon: 8.1335, lat: 33.9197, lon: 8.1335 },
  { id: 'gabes', city: 'Gabes', status: RTUStatus.ONLINE, baseLat: 33.8881, baseLon: 10.0972, lat: 33.8881, lon: 10.0972 },
  { id: 'medenine', city: 'Medenine', status: RTUStatus.WARNING, baseLat: 33.3549, baseLon: 10.5055, lat: 33.3549, lon: 10.5055 },
  { id: 'djerba', city: 'Djerba', status: RTUStatus.ONLINE, baseLat: 33.8750, baseLon: 10.8575, lat: 33.8750, lon: 10.8575 },
  { id: 'tataouine', city: 'Tataouine', status: RTUStatus.OFFLINE, baseLat: 32.9297, baseLon: 10.4518, lat: 32.9297, lon: 10.4518 },
  { id: 'kasserine', city: 'Kasserine', status: RTUStatus.WARNING, baseLat: 35.1676, baseLon: 8.8365, lat: 35.1676, lon: 8.8365 },
  { id: 'beja', city: 'Beja', status: RTUStatus.ONLINE, baseLat: 36.7256, baseLon: 9.1817, lat: 36.7256, lon: 9.1817 },
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

const jitter = (value: number) => value + (Math.random() - 0.5) * 0.03;

const RealtimeTunisiaMap: React.FC = () => {
  const [nodes, setNodes] = useState<RtuNode[]>(BASE_NODES);

  useEffect(() => {
    const timer = setInterval(() => {
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          lat: jitter(node.baseLat),
          lon: jitter(node.baseLon),
        }))
      );
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

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
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {LINKS.map((link) => {
          const from = nodeMap.get(link.from);
          const to = nodeMap.get(link.to);
          if (!from || !to) return null;
          return (
            <Polyline
              key={link.id}
              positions={[
                [from.lat, from.lon],
                [to.lat, to.lon],
              ]}
              pathOptions={{
                color: getLinkColor(link.status),
                weight: 3,
                dashArray: getLinkDash(link.status),
                opacity: 0.85,
              }}
            />
          );
        })}

        {nodes.map((node) => (
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
              <strong>{node.city}</strong> • {node.status}
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
      </Box>

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
