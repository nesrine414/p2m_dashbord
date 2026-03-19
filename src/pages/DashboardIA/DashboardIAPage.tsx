import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { InsightsOutlined, Psychology, ShieldOutlined, TrendingUpOutlined } from '@mui/icons-material';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
  getAlarms,
  getDashboardStats,
  getRecentOtdrTests,
  getRTUs,
  getTopology,
} from '../../services/api';
import { DashboardStats, FiberStatus, RTUStatus } from '../../types';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface AiPredictionCard {
  id: number;
  rtuId: number;
  rtuName: string;
  location: string;
  probability: number;
  riskLevel: RiskLevel;
  features: {
    attenuationDb: number;
    nbAlarms24h: number;
    uptimePercent: number;
  };
  primaryDriver: string;
  horizonHours: number;
}

interface NetworkSummary {
  activeAlarms: number;
  brokenRoutes: number;
  degradedRoutes: number;
  failedTests: number;
  avgAttenuation: number;
  activeAlarmMap: Map<number, number>;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return '#FF4D6D';
    case 'high':
      return '#FF9F1C';
    case 'medium':
      return '#F7C948';
    default:
      return '#7EE081';
  }
};

const getRiskLabel = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Watch';
    default:
      return 'Low';
  }
};

const getRiskLevel = (probability: number): RiskLevel => {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.62) return 'high';
  if (probability >= 0.38) return 'medium';
  return 'low';
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const getStatusPenalty = (status: BackendRTU['status']): number => {
  switch (status) {
    case RTUStatus.OFFLINE:
      return 0.48;
    case RTUStatus.UNREACHABLE:
      return 0.38;
    case RTUStatus.WARNING:
      return 0.22;
    default:
      return 0.08;
  }
};

const getStatusLabel = (status: BackendRTU['status']): string => {
  switch (status) {
    case RTUStatus.OFFLINE:
      return 'RTU offline';
    case RTUStatus.UNREACHABLE:
      return 'RTU unreachable';
    case RTUStatus.WARNING:
      return 'RTU warning state';
    default:
      return 'RTU stable';
  }
};

const DashboardIAPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [tests, setTests] = useState<BackendOtdrTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, rtuData, alarmData, topologyData, testData] = await Promise.all([
          getDashboardStats(),
          getRTUs(),
          getAlarms({ page: 1, pageSize: 500 }),
          getTopology(),
          getRecentOtdrTests(),
        ]);

        if (!active) {
          return;
        }

        setStats(statsData);
        setRtus(rtuData);
        setAlarms(alarmData.data);
        setRoutes(topologyData.routes);
        setTests(testData.data);
      } catch {
        if (!active) {
          return;
        }
        setError('Unable to load AI dashboard telemetry from the backend.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo<NetworkSummary>(() => {
    const activeAlarmMap = new Map<number, number>();

    alarms.forEach((alarm) => {
      if (alarm.lifecycleStatus === 'cleared' || !alarm.rtuId) {
        return;
      }

      const current = activeAlarmMap.get(alarm.rtuId) || 0;
      activeAlarmMap.set(alarm.rtuId, current + 1);
    });

    const validRoutes = routes.filter(
      (route) => typeof route.attenuationDb === 'number' && Number(route.attenuationDb) > 0
    );
    const avgAttenuation =
      validRoutes.length > 0
        ? validRoutes.reduce((total, route) => total + Number(route.attenuationDb || 0), 0) / validRoutes.length
        : 0;

    const activeAlarmTotal = Array.from(activeAlarmMap.values()).reduce((total, count) => total + count, 0);

    return {
      activeAlarms: activeAlarmTotal,
      brokenRoutes: routes.filter((route) => route.fiberStatus === FiberStatus.BROKEN).length,
      degradedRoutes: routes.filter((route) => route.fiberStatus === FiberStatus.DEGRADED).length,
      failedTests: tests.filter((test) => test.result === 'fail').length,
      avgAttenuation: Number(avgAttenuation.toFixed(1)),
      activeAlarmMap,
    };
  }, [alarms, routes, tests]);

  const predictions = useMemo<AiPredictionCard[]>(() => {
    if (rtus.length === 0) {
      return [];
    }

    const availabilityFactor = clamp(((stats?.availability ?? 0) * 0.12) / 100, 0, 0.12);
    const degradedModePenalty = stats?.degradedMode ? 0.03 : 0;

    return rtus
      .map((rtu) => {
        const temperature = typeof rtu.temperature === 'number' ? rtu.temperature : 0;
        const activeAlarmCount = summary.activeAlarmMap.get(rtu.id) || 0;
        const statusPenalty = getStatusPenalty(rtu.status);
        const temperaturePenalty = temperature > 37 ? Math.min(0.18, (temperature - 37) * 0.014) : 0;
        const alarmPenalty = Math.min(0.22, activeAlarmCount * 0.08);
        const routePenalty =
          summary.brokenRoutes > 0 ? Math.min(0.14, summary.brokenRoutes * 0.025) : 0;
        const testPenalty = summary.failedTests > 0 ? Math.min(0.12, summary.failedTests * 0.02) : 0;
        const attenuationPenalty =
          summary.avgAttenuation > 18 ? Math.min(0.12, (summary.avgAttenuation - 18) * 0.02) : 0;
        const jitter = ((rtu.id % 7) + 1) * 0.008;

        const probability = clamp(
          statusPenalty +
            temperaturePenalty +
            alarmPenalty +
            routePenalty +
            testPenalty +
            attenuationPenalty +
            availabilityFactor +
            degradedModePenalty +
            jitter,
          0.05,
          0.95
        );

        const riskLevel = getRiskLevel(probability);
        const driverCandidates = [
          { label: getStatusLabel(rtu.status), impact: statusPenalty },
          {
            label: temperature > 37 ? `Temperature at ${temperature}C` : 'Temperature within range',
            impact: temperaturePenalty,
          },
          {
            label:
              activeAlarmCount > 0
                ? `${activeAlarmCount} active alarm${activeAlarmCount > 1 ? 's' : ''}`
                : 'No active alarms',
            impact: alarmPenalty,
          },
          {
            label:
              summary.brokenRoutes > 0
                ? `${summary.brokenRoutes} broken fiber route${summary.brokenRoutes > 1 ? 's' : ''}`
                : 'Fiber routes stable',
            impact: routePenalty,
          },
          {
            label:
              summary.failedTests > 0
                ? `${summary.failedTests} recent OTDR failure${summary.failedTests > 1 ? 's' : ''}`
                : 'OTDR tests passing',
            impact: testPenalty,
          },
        ];

        const primaryDriverCandidate = driverCandidates.sort((left, right) => right.impact - left.impact)[0];
        const primaryDriver =
          primaryDriverCandidate && primaryDriverCandidate.impact > 0
            ? primaryDriverCandidate.label
            : 'Stable telemetry baseline';

        return {
          id: rtu.id,
          rtuId: rtu.id,
          rtuName: rtu.name,
          location: rtu.locationAddress || 'Unknown location',
          probability,
          riskLevel,
          features: {
            attenuationDb: summary.avgAttenuation,
            nbAlarms24h: activeAlarmCount,
            uptimePercent: Number(clamp(100 - probability * 24 - activeAlarmCount * 1.2, 0, 100).toFixed(1)),
          },
          primaryDriver,
          horizonHours:
            riskLevel === 'critical' ? 12 : riskLevel === 'high' ? 24 : riskLevel === 'medium' ? 48 : 72,
        };
      })
      .sort((left, right) => right.probability - left.probability);
  }, [rtus, stats?.availability, stats?.degradedMode, summary]);

  const topPredictions = useMemo(() => predictions.slice(0, 5), [predictions]);

  const globalScore = useMemo(() => {
    if (predictions.length === 0) {
      return 0;
    }

    const averageRisk = predictions.reduce((acc, item) => acc + item.probability, 0) / predictions.length;
    const availability = stats?.availability ?? 0;
    const rawScore =
      availability * 0.65 +
      (100 - averageRisk * 100) * 0.35 -
      summary.brokenRoutes * 2.5 -
      summary.degradedRoutes * 0.9 -
      summary.failedTests * 0.7;

    return Math.round(clamp(rawScore, 0, 100));
  }, [predictions, stats?.availability, summary.brokenRoutes, summary.degradedRoutes, summary.failedTests]);

  const scoreLabel =
    globalScore >= 85 ? 'Healthy' : globalScore >= 70 ? 'Stable' : globalScore >= 50 ? 'Watch' : 'Critical';

  const scoreColor =
    globalScore >= 85 ? '#7EE081' : globalScore >= 70 ? '#7CCBFF' : globalScore >= 50 ? '#F7C948' : '#FF4D6D';

  return (
    <Box>
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Psychology sx={{ fontSize: 40, color: '#9C27B0' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              Artificial Intelligence Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Live risk scoring derived from RTUs, alarms, topology, and OTDR telemetry
            </Typography>
          </Box>
          <Chip
            icon={<TrendingUpOutlined />}
            label={`${predictions.length} RTUs scored`}
            sx={{ backgroundColor: 'rgba(124, 203, 255, 0.16)', color: 'white', fontWeight: 'bold' }}
          />
        </Box>
      </Box>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading AI telemetry...
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats?.degradedMode && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Backend is running in degraded mode, so these AI insights are inferred from the Tunisia demo telemetry.
        </Alert>
      )}

      {!stats?.degradedMode && !error && stats && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Live backend telemetry is connected and feeding this AI dashboard.
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Overall network health score
            </Typography>

            <Box
              sx={{
                width: 190,
                height: 190,
                borderRadius: '50%',
                background: `conic-gradient(${scoreColor} ${globalScore}%, rgba(255,255,255,0.08) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '20px auto',
              }}
            >
              <Box
                sx={{
                  width: 154,
                  height: 154,
                  borderRadius: '50%',
                  backgroundColor: '#0A0E27',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h2" fontWeight="bold" sx={{ color: scoreColor }}>
                  {globalScore}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  /100
                </Typography>
              </Box>
            </Box>

            <Chip
              label={`${scoreLabel} (${formatPercent(globalScore)})`}
              sx={{ backgroundColor: scoreColor, color: '#07111f', fontWeight: 'bold', width: '100%' }}
            />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center" mt={2}>
              <Chip label={`RTUs ${rtus.length}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} />
              <Chip
                label={`Alarms ${summary.activeAlarms}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }}
              />
              <Chip
                label={`Routes ${summary.brokenRoutes + summary.degradedRoutes}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }}
              />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1.25}>
                <InsightsOutlined sx={{ color: '#7CCBFF' }} />
                <Typography variant="h6" fontWeight={700} color="white">
                  Predictive alerts
                </Typography>
              </Box>
              <Chip
                label={`${topPredictions.length}/${predictions.length || 0} high-priority`}
                sx={{ backgroundColor: 'rgba(255, 77, 109, 0.16)', color: 'white', fontWeight: 'bold' }}
              />
            </Box>

            {topPredictions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No live RTU data available yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {topPredictions.map((prediction) => (
                  <Box
                    key={prediction.id}
                    className="glass-card"
                    sx={{
                      p: 2.2,
                      borderLeft: `4px solid ${getRiskColor(prediction.riskLevel)}`,
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} color="white">
                          {prediction.rtuName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {prediction.location}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="h5" fontWeight="bold" sx={{ color: getRiskColor(prediction.riskLevel) }}>
                          {Math.round(prediction.probability * 100)}%
                        </Typography>
                        <Chip
                          label={getRiskLabel(prediction.riskLevel).toUpperCase()}
                          size="small"
                          sx={{
                            mt: 0.5,
                            backgroundColor: getRiskColor(prediction.riskLevel),
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1 }}>
                      Primary driver: {prediction.primaryDriver}
                    </Typography>

                    <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        label={`Attenuation: ${prediction.features.attenuationDb.toFixed(1)} dB`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`Alarms: ${prediction.features.nbAlarms24h}`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`Uptime: ${prediction.features.uptimePercent.toFixed(1)}%`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`${prediction.horizonHours}h horizon`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1.25} mb={2}>
              <ShieldOutlined sx={{ color: '#7EE081' }} />
              <Typography variant="h6" fontWeight={700} color="white">
                Top critical RTUs
              </Typography>
            </Box>

            {predictions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No RTU telemetry available yet.
              </Typography>
            ) : (
              topPredictions.map((prediction, index) => (
                <Box key={prediction.id} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" color="white">
                      {index + 1}. {prediction.rtuName}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color="white">
                      {Math.round(prediction.probability * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={prediction.probability * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getRiskColor(prediction.riskLevel),
                      },
                    }}
                  />
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardIAPage;
