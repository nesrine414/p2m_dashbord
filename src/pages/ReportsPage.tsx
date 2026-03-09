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
  nqmsMatrixRows,
  qualityKpis,
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
            Vue 3 - Qualite & Historique
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tendances attenuation, KPI MTTR/MTBF et matrice de supervision NQMS.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FilePresentOutlined />} sx={{ borderRadius: 2 }}>
          New Report Batch
        </Button>
      </Stack>

      <Grid container spacing={2.5} mb={3}>
        {qualityKpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2.2, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Chip label={kpi.criticality} size="small" color={kpi.criticality === 'Critique' ? 'error' : kpi.criticality === 'Moyenne' ? 'warning' : 'default'} />
              </Stack>
              <Typography variant="h5" color="white" fontWeight={700}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="#8fb3d1">
                {kpi.trend}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
            <Typography variant="h6" color="white" mb={2}>
              Performance Evolution
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
                      <Bar dataKey="mttr" fill="#ff8f6c" name="MTTR h" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', height: '100%' }}>
            <Typography variant="h6" color="white" mb={2}>
              Scheduled Deliveries
            </Typography>
            <Stack spacing={1.3}>
              {scheduledReports.map((item) => (
                <Box key={item.id} sx={{ p: 1.4, borderRadius: 2, backgroundColor: '#293247' }}>
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

      <Grid container spacing={3} mb={3}>
        {reportTemplates.map((template) => (
          <Grid key={template.id} size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
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
                <Typography variant="caption" color="text.secondary">Frequency: {template.frequency}</Typography>
                <Typography variant="caption" color="text.secondary">Owner: {template.owner}</Typography>
                <Typography variant="caption" color="text.secondary">Last run: {template.lastRun}</Typography>
              </Stack>
              <Button variant="outlined" size="small">Generate Now</Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
        <Typography variant="h6" color="white" mb={2}>
          Matrice NQMS Complete
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domaine</TableCell>
                <TableCell>Parametre</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Valeurs</TableCell>
                <TableCell>Widget</TableCell>
                <TableCell>Criticite</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nqmsMatrixRows.map((row) => (
                <TableRow key={`${row.domain}-${row.parameter}`} hover>
                  <TableCell>{row.domain}</TableCell>
                  <TableCell>{row.parameter}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.values}</TableCell>
                  <TableCell>{row.widgetType}</TableCell>
                  <TableCell>{row.criticality}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
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
                    <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} disabled={report.status !== 'Ready'}>
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