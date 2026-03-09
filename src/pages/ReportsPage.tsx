import React from 'react';
import {
  Box,
  Button,
  Chip,
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
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DownloadOutlined, FilePresentOutlined } from '@mui/icons-material';
import {
  generatedReports,
  networkPerformanceSeries,
  reportTemplates,
  scheduledReports,
} from '../data/mockData';

const ReportsPage: React.FC = () => {
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
            Reports Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build and distribute operational reports from static analytics views.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FilePresentOutlined />} sx={{ borderRadius: 2 }}>
          New Report Batch
        </Button>
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        {reportTemplates.map((template) => (
          <Grid key={template.id} size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" color="white">
                  {template.name}
                </Typography>
                <Chip label={template.status} color={template.status === 'Healthy' ? 'success' : 'warning'} size="small" />
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {template.description}
              </Typography>
              <Stack spacing={0.5} mb={2}>
                <Typography variant="caption" color="text.secondary">
                  Frequency: {template.frequency}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Owner: {template.owner}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last run: {template.lastRun}
                </Typography>
              </Stack>
              <Button variant="outlined" size="small">
                Generate Now
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
            <Typography variant="h6" color="white" mb={2}>
              Monthly Network Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={networkPerformanceSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                      <XAxis dataKey="month" stroke="#9aa9bd" />
                      <YAxis stroke="#9aa9bd" domain={[98.8, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="availability" stroke="#76d6ff" strokeWidth={2.5} name="Availability %" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={networkPerformanceSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f3a4e" />
                      <XAxis dataKey="month" stroke="#9aa9bd" />
                      <YAxis stroke="#9aa9bd" />
                      <Tooltip />
                      <Bar dataKey="criticalAlarms" fill="#ff8f6c" name="Critical alarms" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Scheduled Deliveries
            </Typography>
            <Stack spacing={1.3}>
              {scheduledReports.map((item) => (
                <Box key={item.id} sx={{ p: 1.4, borderRadius: 2, backgroundColor: '#1c2433' }}>
                  <Typography variant="body2" color="white" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.schedule}
                  </Typography>
                  <Typography variant="caption" color="#8fb3d1" display="block">
                    Recipients: {item.recipients}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#171d28', border: '1px solid #2b3445' }}>
        <Typography variant="h6" color="white" mb={2}>
          Generated Files
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Generated At</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Download</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {generatedReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>{report.fileName}</TableCell>
                  <TableCell>{report.period}</TableCell>
                  <TableCell>{report.generatedAt}</TableCell>
                  <TableCell>{report.generatedBy}</TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell>
                    <Chip label={report.status} size="small" color={report.status === 'Ready' ? 'success' : 'warning'} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadOutlined />}
                      disabled={report.status !== 'Ready'}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ReportsPage;
