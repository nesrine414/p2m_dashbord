import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import WidgetCard from '../components/common/WidgetCard';
import { Speed, CheckCircle, Warning } from '@mui/icons-material';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom color="white">
        Dashboard P2M - Vue Globale
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Supervision en temps réel du réseau fibre optique
      </Typography>

      {/* Widgets Stats */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} >
          <WidgetCard
            title="RTU EN LIGNE"
            value="45/50"
            subtitle="90% disponibilité"
            icon={<CheckCircle sx={{ color: 'white', fontSize: 32 }} />}
            color="#4caf50"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <WidgetCard
            title="ALARMES ACTIVES"
            value="6"
            subtitle="3 Critiques • 3 Majeures"
            icon={<Warning sx={{ color: 'white', fontSize: 32 }} />}
            color="#f44336"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <WidgetCard
            title="FIBRE HEALTH"
            value="12"
            subtitle="9 Normales • 2 Dégradées"
            icon={<Speed sx={{ color: 'white', fontSize: 32 }} />}
            color="#2196f3"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <WidgetCard
            title="MTTR"
            value="2.4h"
            subtitle="Temps moyen réparation"
            icon={<Speed sx={{ color: 'white', fontSize: 32 }} />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Placeholder pour graphiques futurs */}
      <Box mt={3} sx={{ backgroundColor: '#1e1e1e', p: 3, borderRadius: 2 }}>
        <Typography variant="h6" color="white" gutterBottom>
          📊 Graphiques et widgets à venir...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          - Graphique Attenuation Trend
          <br />
          - Tableau Alarmes récentes
          <br />
          - Cartes RTU avec statuts
          <br />- Topologie réseau
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardPage;