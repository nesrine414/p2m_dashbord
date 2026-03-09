import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AutoGraphOutlined, DeviceHubOutlined, RouteOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import {
  attenuationSeries,
  fiberRouteRecords,
  liveEvents,
  otdrRecentTests,
} from '../data/mockData';
import { FiberStatus, TestResult } from '../types';

const MonitoringPage: React.FC = () => {
  const summary = useMemo(() => {
    const normal = fiberRouteRecords.filter((route) => route.fiberStatus === FiberStatus.NORMAL).length;
    const degraded = fiberRouteRecords.filter((route) => route.fiberStatus === FiberStatus.DEGRADED).length;
    const broken = fiberRouteRecords.filter((route) => route.fiberStatus === FiberStatus.BROKEN).length;
    const avgAttenuation =
      fiberRouteRecords
        .filter((route) => route.attenuationDb > 0)
        .reduce((sum, route) => sum + route.attenuationDb, 0) /
      fiberRouteRecords.filter((route) => route.attenuationDb > 0).length;
    const failedTests = otdrRecentTests.filter((test) => test.result === TestResult.FAIL).length;

    return {
      normal,
      degraded,
      broken,
      avgAttenuation: avgAttenuation.toFixed(1),
      failedTests,
    };
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.5}>
        Vue 2 - Reseau
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Topologie optique, attenuation et resultats OTDR.
      </Typography>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#27382e', border: '1px solid #4b6b59' }}>
            <Typography variant="caption" color="text.secondary">
              Fiber Normal
            </Typography>
            <Typography variant="h5" color="#8fe7a7" fontWeight={700}>
              {summary.normal}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#3a3228', border: '1px solid #7c6646' }}>
            <Typography variant="caption" color="text.secondary">
              Fiber Degraded
            </Typography>
            <Typography variant="h5" color="#ffc98c" fontWeight={700}>
              {summary.degraded}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#422d33', border: '1px solid #8a5762' }}>
            <Typography variant="caption" color="text.secondary">
              Fiber Broken
            </Typography>
            <Typography variant="h5" color="#ff8d9a" fontWeight={700}>
              {summary.broken}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#252d40', border: '1px solid #46546c' }}>
            <Typography variant="caption" color="text.secondary">
              Avg Attenuation
            </Typography>
            <Typography variant="h5" color="white" fontWeight={700}>
              {summary.avgAttenuation} dB
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <AutoGraphOutlined sx={{ color: '#86c8ff' }} />
              <Typography variant="h6" color="white">
                Attenuation Trend
              </Typography>
            </Stack>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attenuationSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                  <XAxis dataKey="slot" stroke="#9aa9bd" />
                  <YAxis stroke="#9aa9bd" />
                  <Tooltip />
                  <Line type="monotone" dataKey="backboneNorth" stroke="#55c2ff" strokeWidth={2} dot={false} name="Backbone North" />
                  <Line type="monotone" dataKey="backboneSouth" stroke="#ff9f5a" strokeWidth={2} dot={false} name="Backbone South" />
                  <Line type="monotone" dataKey="metroRing" stroke="#92e7a9" strokeWidth={2} dot={false} name="Metro Ring" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Event Stream
            </Typography>
            <Stack spacing={1.5}>
              {liveEvents.map((event) => (
                <Box key={event.id} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#293247' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {event.timestamp}
                    </Typography>
                    <StatusBadge status={event.severity} />
                  </Stack>
                  <Typography variant="body2" color="white" mt={0.6}>
                    {event.message}
                  </Typography>
                  <Typography variant="caption" color="#8fb3d1">
                    {event.source}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <RouteOutlined sx={{ color: '#8fd3ff' }} />
              <Typography variant="h6" color="white">
                Optical Routes
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell>Fiber Status</TableCell>
                    <TableCell>Route Status</TableCell>
                    <TableCell>Length</TableCell>
                    <TableCell>Attenuation</TableCell>
                    <TableCell>Reflection Events</TableCell>
                    <TableCell>Last Test</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fiberRouteRecords.map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>{route.routeName}</TableCell>
                      <TableCell>{route.source} to {route.destination}</TableCell>
                      <TableCell>
                        <StatusBadge status={route.fiberStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={route.routeStatus} variant="outlined" />
                      </TableCell>
                      <TableCell>{route.lengthKm.toFixed(1)} km</TableCell>
                      <TableCell>{route.attenuationDb === 0 ? 'N/A' : `${route.attenuationDb.toFixed(1)} dB`}</TableCell>
                      <TableCell>{route.reflectionEvents ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{route.lastTestTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <DeviceHubOutlined sx={{ color: '#9bb9ff' }} />
              <Typography variant="h6" color="white">
                OTDR Recent Tests ({summary.failedTests} fail)
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Pulse</TableCell>
                    <TableCell>Range</TableCell>
                    <TableCell>Wavelength</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {otdrRecentTests.map((test) => (
                    <TableRow key={test.id} hover>
                      <TableCell>{test.routeName}</TableCell>
                      <TableCell>{test.mode}</TableCell>
                      <TableCell>{test.pulseWidth}</TableCell>
                      <TableCell>{test.dynamicRangeDb} dB</TableCell>
                      <TableCell>{test.wavelengthNm} nm</TableCell>
                      <TableCell>
                        <StatusBadge status={test.result} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPage;
