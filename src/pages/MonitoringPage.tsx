import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { BoltOutlined, SpeedOutlined, MemoryOutlined, RouterOutlined } from '@mui/icons-material';
import StatusBadge from '../components/common/StatusBadge';
import { attenuationSeries, liveEvents, monitoringNodes } from '../data/mockData';

const MonitoringPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.5}>
        Real-Time Monitoring
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Static live board for optical links and device telemetry.
      </Typography>

      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#1d2330', border: '1px solid #2f3b4e' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Throughput
                </Typography>
                <Typography variant="h5" color="white" fontWeight={700}>
                  18.4 Gbps
                </Typography>
              </Box>
              <SpeedOutlined sx={{ color: '#8fd3ff' }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#1f2a20', border: '1px solid #31543c' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Healthy Links
                </Typography>
                <Typography variant="h5" color="#8fe7a7" fontWeight={700}>
                  92%
                </Typography>
              </Box>
              <RouterOutlined sx={{ color: '#8fe7a7' }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#2a221a', border: '1px solid #5e4828' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Mean Latency
                </Typography>
                <Typography variant="h5" color="white" fontWeight={700}>
                  14.8 ms
                </Typography>
              </Box>
              <BoltOutlined sx={{ color: '#ffc98c' }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.3, borderRadius: 3, backgroundColor: '#251f2c', border: '1px solid #4d3a62' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Core CPU
                </Typography>
                <Typography variant="h5" color="white" fontWeight={700}>
                  57%
                </Typography>
              </Box>
              <MemoryOutlined sx={{ color: '#c2a8ff' }} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              Attenuation Trend (dB)
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attenuationSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                  <XAxis dataKey="slot" stroke="#9aa9bd" />
                  <YAxis stroke="#9aa9bd" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="backboneNorth"
                    stroke="#55c2ff"
                    strokeWidth={2}
                    dot={false}
                    name="Backbone North"
                  />
                  <Line
                    type="monotone"
                    dataKey="backboneSouth"
                    stroke="#ff9f5a"
                    strokeWidth={2}
                    dot={false}
                    name="Backbone South"
                  />
                  <Line
                    type="monotone"
                    dataKey="metroRing"
                    stroke="#92e7a9"
                    strokeWidth={2}
                    dot={false}
                    name="Metro Ring"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Event Stream
            </Typography>
            <Stack spacing={1.5}>
              {liveEvents.map((event) => (
                <Box key={event.id} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#1c2433' }}>
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

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
        <Typography variant="h6" color="white" mb={2}>
          Node Health Board
        </Typography>
        <Grid container spacing={2}>
          {monitoringNodes.map((node) => (
            <Grid key={node.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#1c2433' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.4}>
                  <Typography variant="body1" color="white" fontWeight={700}>
                    {node.name}
                  </Typography>
                  <StatusBadge status={node.status} />
                </Stack>
                <Stack spacing={1.2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        CPU
                      </Typography>
                      <Typography variant="caption" color="white">
                        {node.cpuPercent}%
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={node.cpuPercent} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Packet Loss
                      </Typography>
                      <Typography variant="caption" color="white">
                        {node.packetLossPercent}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(node.packetLossPercent * 20, 100)}
                      color={node.packetLossPercent > 1 ? 'warning' : 'success'}
                      sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Stack>
                <Divider sx={{ my: 1.4, borderColor: '#2f3a4e' }} />
                <Stack direction="row" justifyContent="space-between">
                  <Chip label={`Latency ${node.latencyMs} ms`} size="small" />
                  <Chip label={`Signal ${node.signalDbm} dBm`} size="small" />
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default MonitoringPage;
