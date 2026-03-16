import React, { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import StatusBadge from '../common/StatusBadge';
import { FiberStatus, RTUStatus } from '../../types';

interface TopologyNode {
  id: string;
  label: string;
  status: RTUStatus;
  lat: number;
  lon: number;
}

interface TopologyLink {
  id: string;
  from: string;
  to: string;
  status: FiberStatus;
}

const MAP_BOUNDS = {
  minLat: 30.2,
  maxLat: 37.6,
  minLon: 7.5,
  maxLon: 11.9,
};

const nodes: TopologyNode[] = [
  { id: 'tunis', label: 'Tunis', status: RTUStatus.ONLINE, lat: 36.8065, lon: 10.1815 },
  { id: 'bizerte', label: 'Bizerte', status: RTUStatus.WARNING, lat: 37.2746, lon: 9.8739 },
  { id: 'nabeul', label: 'Nabeul', status: RTUStatus.ONLINE, lat: 36.4513, lon: 10.7353 },
  { id: 'sousse', label: 'Sousse', status: RTUStatus.ONLINE, lat: 35.8256, lon: 10.636 },
  { id: 'monastir', label: 'Monastir', status: RTUStatus.WARNING, lat: 35.7643, lon: 10.8113 },
  { id: 'sfax', label: 'Sfax', status: RTUStatus.ONLINE, lat: 34.7398, lon: 10.7600 },
  { id: 'kairouan', label: 'Kairouan', status: RTUStatus.ONLINE, lat: 35.6781, lon: 10.0963 },
  { id: 'gafsa', label: 'Gafsa', status: RTUStatus.WARNING, lat: 34.4311, lon: 8.7757 },
  { id: 'tozeur', label: 'Tozeur', status: RTUStatus.ONLINE, lat: 33.9197, lon: 8.1335 },
  { id: 'gabes', label: 'Gabes', status: RTUStatus.ONLINE, lat: 33.8881, lon: 10.0972 },
  { id: 'medenine', label: 'Medenine', status: RTUStatus.WARNING, lat: 33.3549, lon: 10.5055 },
  { id: 'djerba', label: 'Djerba', status: RTUStatus.ONLINE, lat: 33.8750, lon: 10.8575 },
  { id: 'tataouine', label: 'Tataouine', status: RTUStatus.OFFLINE, lat: 32.9297, lon: 10.4518 },
  { id: 'kasserine', label: 'Kasserine', status: RTUStatus.WARNING, lat: 35.1676, lon: 8.8365 },
  { id: 'beja', label: 'Beja', status: RTUStatus.ONLINE, lat: 36.7256, lon: 9.1817 },
];

const links: TopologyLink[] = [
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

const projectToMap = (lat: number, lon: number) => {
  const x = ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return { x, y };
};

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
  if (status === FiberStatus.DEGRADED) return '6 4';
  if (status === FiberStatus.BROKEN) return '3 4';
  return undefined;
};

const TopologyMap: React.FC = () => {
  const nodePositions = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        ...projectToMap(node.lat, node.lon),
      })),
    []
  );

  return (
    <Box
      sx={{
        position: 'relative',
        height: 360,
        borderRadius: 3,
        backgroundImage: `url('/maps/tunisia.svg')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundColor: '#1b2336',
        border: '1px solid rgba(156, 176, 217, 0.24)',
        overflow: 'hidden',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
        {links.map((link) => {
          const from = nodePositions.find((node) => node.id === link.from);
          const to = nodePositions.find((node) => node.id === link.to);
          if (!from || !to) return null;
          return (
            <line
              key={link.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={getLinkColor(link.status)}
              strokeWidth={1.8}
              strokeDasharray={getLinkDash(link.status)}
              opacity={0.9}
            />
          );
        })}
      </svg>

      {nodePositions.map((node) => (
        <Box
          key={node.id}
          sx={{
            position: 'absolute',
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
            minWidth: 120,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: getNodeColor(node.status),
              boxShadow: `0 0 12px ${getNodeColor(node.status)}`,
              margin: '0 auto 6px',
            }}
          />
          <Typography variant="caption" color="white" fontWeight={600} display="block">
            {node.label}
          </Typography>
          <StatusBadge status={node.status} variant="outlined" />
        </Box>
      ))}

      <Box sx={{ position: 'absolute', right: 16, bottom: 16 }}>
        <Stack spacing={0.6} sx={{ backgroundColor: 'rgba(15, 20, 34, 0.7)', p: 1.2, borderRadius: 2 }}>
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

export default TopologyMap;
