import React from 'react';
import {
  Box,
  Button,
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

const ReportsPage: React.FC = () => {
  const kpis = [
    { id: 'mttr', label: 'MTTR', value: '2.4h', note: 'Temps moyen de reparation' },
    { id: 'mtbf', label: 'MTBF', value: '120h', note: 'Temps moyen entre pannes' },
    { id: 'availability', label: 'Disponibilite', value: '99.2%', note: 'SLA reseau' },
  ];

  const nqmsParameters = [
    {
      domaine: 'RTU',
      parametre: 'RTU Status',
      valeurs: 'Online / Offline / Unreachable',
      widget: 'Tuile / LED',
      criticite: 'Critique',
    },
    {
      domaine: 'RTU',
      parametre: 'Power Supply',
      valeurs: 'Normal / Failure',
      widget: 'Tuile',
      criticite: 'Critique',
    },
    {
      domaine: 'RTU',
      parametre: 'OTDR Availability',
      valeurs: 'Ready / Busy / Fault',
      widget: 'Icone statut',
      criticite: 'Critique',
    },
    {
      domaine: 'Fibre',
      parametre: 'Fiber Status',
      valeurs: 'Normal / Degraded / Broken',
      widget: 'Carte / Liste',
      criticite: 'Critique',
    },
    {
      domaine: 'Fibre',
      parametre: 'Route Status',
      valeurs: 'Active / Inactive / Skipped',
      widget: 'Liste',
      criticite: 'Critique',
    },
    {
      domaine: 'Fibre',
      parametre: 'Attenuation',
      valeurs: 'dB seuil configurable',
      widget: 'Jauge',
      criticite: 'Critique',
    },
    {
      domaine: 'OTDR',
      parametre: 'Test Result',
      valeurs: 'Pass / Fail',
      widget: 'Tableau',
      criticite: 'Critique',
    },
    {
      domaine: 'Alarmes',
      parametre: 'Alarm Type',
      valeurs: 'Fiber Cut / High Loss / RTU Down',
      widget: 'Liste',
      criticite: 'Critique',
    },
    {
      domaine: 'Performance',
      parametre: 'MTTR',
      valeurs: 'Heures',
      widget: 'KPI',
      criticite: 'Moyenne',
    },
    {
      domaine: 'Performance',
      parametre: 'MTBF',
      valeurs: 'Heures',
      widget: 'KPI',
      criticite: 'Moyenne',
    },
  ];

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const buildMatrixCsv = () => {
    const headers = ['Domaine', 'Parametre', 'Valeurs', 'Widget', 'Criticite'];
    const rows = nqmsParameters.map((param) => [
      param.domaine,
      param.parametre,
      param.valeurs,
      param.widget,
      param.criticite,
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
      .join('\n');
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildPdfHtml = () => {
    const rows = nqmsParameters
      .map(
        (param) => `
          <tr>
            <td>${escapeHtml(param.domaine)}</td>
            <td>${escapeHtml(param.parametre)}</td>
            <td>${escapeHtml(param.valeurs)}</td>
            <td>${escapeHtml(param.widget)}</td>
            <td>${escapeHtml(param.criticite)}</td>
          </tr>`
      )
      .join('');

    const kpiRows = kpis
      .map(
        (kpi) => `
          <tr>
            <td>${escapeHtml(kpi.label)}</td>
            <td>${escapeHtml(kpi.value)}</td>
            <td>${escapeHtml(kpi.note)}</td>
          </tr>`
      )
      .join('');

    return `<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Reports NQMS</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f1b2d; }
            h1 { margin: 0 0 6px; }
            h2 { margin: 28px 0 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccd5e1; padding: 8px; text-align: left; }
            th { background: #f0f4fa; }
            .meta { color: #5b6b80; font-size: 12px; margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <h1>Reports & Documentation</h1>
          <div class="meta">Export genere le ${new Date().toLocaleString()}</div>

          <h2>KPIs de performance</h2>
          <table>
            <thead>
              <tr>
                <th>KPI</th>
                <th>Valeur</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${kpiRows}
            </tbody>
          </table>

          <h2>Matrice NQMS - Parametres critiques</h2>
          <table>
            <thead>
              <tr>
                <th>Domaine</th>
                <th>Parametre</th>
                <th>Valeurs</th>
                <th>Widget</th>
                <th>Criticite</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>`;
  };

  const handleExportPdf = () => {
    const html = buildPdfHtml();
    const popup = window.open('', '_blank', 'width=980,height=720');
    if (!popup) {
      downloadBlob(html, 'reports.html', 'text/html;charset=utf-8;');
      return;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleExportExcel = () => {
    const csv = buildMatrixCsv();
    downloadBlob(csv, 'nqms-matrix.csv', 'text/csv;charset=utf-8;');
  };

  const handleExportCustom = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      kpis,
      nqmsParameters,
    };
    downloadBlob(JSON.stringify(payload, null, 2), 'reports-custom.json', 'application/json');
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="white" mb={0.6}>
        Reports & Documentation
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        KPIs de performance, rapports periodiques et documentation technique.
      </Typography>

      <Grid container spacing={2.5} mb={3}>
        {kpis.map((kpi) => (
          <Grid key={kpi.id} size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2.4, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
              <Typography variant="caption" color="text.secondary">
                {kpi.label}
              </Typography>
              <Typography variant="h5" color="white" fontWeight={700} mt={0.6} mb={0.4}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="#8fb3d1">
                {kpi.note}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63', mb: 3 }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Matrice NQMS - Parametres critiques
        </Typography>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domaine</TableCell>
                <TableCell>Parametre</TableCell>
                <TableCell>Valeurs</TableCell>
                <TableCell>Widget</TableCell>
                <TableCell>Criticite</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nqmsParameters.map((param, index) => (
                <TableRow key={`${param.domaine}-${param.parametre}-${index}`} hover>
                  <TableCell sx={{ color: 'white' }}>{param.domaine}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{param.parametre}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{param.valeurs}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{param.widget}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: '8px',
                        backgroundColor:
                          param.criticite === 'Critique'
                            ? 'rgba(255,51,102,0.2)'
                            : 'rgba(255,184,0,0.2)',
                        color: param.criticite === 'Critique' ? '#FF3366' : '#FFB800',
                        fontWeight: 'bold',
                        fontSize: 12,
                        width: 'fit-content',
                      }}
                    >
                      {param.criticite}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3, backgroundColor: '#22283a', border: '1px solid #3f4a63' }}>
        <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
          Generer rapports
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Export rapide en PDF ou Excel, ou creation d un rapport personnalise.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={handleExportPdf}>
            PDF
          </Button>
          <Button variant="outlined" onClick={handleExportExcel}>
            Excel
          </Button>
          <Button variant="outlined" onClick={handleExportCustom}>
            Personnalise
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ReportsPage;
