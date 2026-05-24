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
  postPanneRiskPrediction,
} from '../../services/api';
import { DashboardStats, FiberStatus, RTUStatus } from '../../types';
import { normalizeRtuStatus } from '../../utils/rtuStatus';

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
      return 'Critique';
    case 'high':
      return 'Eleve';
    case 'medium':
      return 'Surveillance';
    default:
      return 'Faible';
  }
};

const getRiskLevel = (probability: number): RiskLevel => {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.62) return 'high';
  if (probability >= 0.38) return 'medium';
  return 'low';
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const formatProbabilityDisplay = (probability: number): string => {
  const percentage = probability * 100;

  if (percentage >= 99.5) {
    return '>99%';
  }

  if (percentage <= 0.5) {
    return '<1%';
  }

  return `${Math.round(percentage)}%`;
};

const getConfidenceLabel = (probability: number): string => {
  if (probability >= 0.85) return 'Confiance tres forte';
  if (probability >= 0.65) return 'Confiance elevee';
  if (probability >= 0.4) return 'Confiance moderee';
  return 'Confiance faible';
};

const truncateText = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const getStatusPenalty = (status: BackendRTU['status']): number => {
  switch (normalizeRtuStatus(status)) {
    case RTUStatus.OFFLINE:
      return 0.48;
    case RTUStatus.UNREACHABLE:
      return 0.38;
    default:
      return 0.08;
  }
};

const getStatusLabel = (status: BackendRTU['status']): string => {
  switch (normalizeRtuStatus(status)) {
    case RTUStatus.OFFLINE:
      return 'RTU hors ligne';
    case RTUStatus.UNREACHABLE:
      return 'RTU injoignable';
    default:
      return 'RTU stable';
  }
};

const isActiveAlarm = (alarm: BackendAlarm): boolean =>
  !['cleared', 'resolved', 'closed'].includes(alarm.lifecycleStatus);

const buildNetworkSummaryFromData = (
  alarms: BackendAlarm[],
  routes: BackendFiberRoute[],
  tests: BackendOtdrTest[]
): NetworkSummary => {
  const activeAlarmMap = new Map<number, number>();

  alarms.forEach((alarm) => {
    if (!isActiveAlarm(alarm) || !alarm.rtuId) {
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
};

const average = (values: number[], fallback: number): number =>
  values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : fallback;

const toMlRtuStatus = (status: BackendRTU['status']): 'Online' | 'Offline' | 'Unreachable' => {
  switch (normalizeRtuStatus(status)) {
    case RTUStatus.OFFLINE:
      return 'Offline';
    case RTUStatus.UNREACHABLE:
      return 'Unreachable';
    default:
      return 'Online';
  }
};

const toMlPowerSupply = (status: BackendRTU['status']): 'Normal' | 'Failure' =>
  normalizeRtuStatus(status) === RTUStatus.OFFLINE ? 'Failure' : 'Normal';

const toMlOtdrAvailability = (status: BackendRTU['status']): 'Ready' | 'Busy' | 'Fault' => {
  switch (normalizeRtuStatus(status)) {
    case RTUStatus.OFFLINE:
    case RTUStatus.UNREACHABLE:
      return 'Fault';
    case RTUStatus.WARNING:
      return 'Busy';
    default:
      return 'Ready';
  }
};

const toMlFiberStatus = (routes: BackendFiberRoute[]): 'Normal' | 'Degraded' | 'Broken' => {
  if (routes.some((route) => route.fiberStatus === FiberStatus.BROKEN)) {
    return 'Broken';
  }

  if (routes.some((route) => route.fiberStatus === FiberStatus.DEGRADED)) {
    return 'Degraded';
  }

  return 'Normal';
};

const toMlRouteStatus = (routes: BackendFiberRoute[]): 'Active' | 'Skipped' | 'Inactive' => {
  if (routes.some((route) => route.routeStatus === 'active')) {
    return 'Active';
  }

  if (routes.some((route) => route.routeStatus === 'skipped')) {
    return 'Skipped';
  }

  return 'Inactive';
};

const toMlTestMode = (mode?: BackendOtdrTest['mode']): 'Auto' | 'Manual' | 'Scheduled' => {
  switch (mode) {
    case 'manual':
      return 'Manual';
    case 'scheduled':
      return 'Scheduled';
    default:
      return 'Auto';
  }
};

const toMlTestResult = (result?: BackendOtdrTest['result']): 'Pass' | 'Fail' =>
  result === 'fail' ? 'Fail' : 'Pass';

const toMlAlarmType = (alarm?: BackendAlarm): 'Fiber Cut' | 'High Loss' | 'RTU Down' | 'None' => {
  if (!alarm) {
    return 'None';
  }

  if (alarm.alarmType === 'Fiber Cut' || alarm.alarmType === 'High Loss' || alarm.alarmType === 'RTU Down') {
    return alarm.alarmType;
  }

  return 'None';
};

const toMlSeverity = (alarm?: BackendAlarm): 'None' | 'Minor' | 'Major' | 'Critical' => {
  if (!alarm) {
    return 'None';
  }

  switch (alarm.severity) {
    case 'critical':
      return 'Critical';
    case 'major':
      return 'Major';
    case 'minor':
      return 'Minor';
    default:
      return 'None';
  }
};

const toMlAlarmStatus = (alarm?: BackendAlarm): 'None' | 'Cleared' | 'Acknowledged' | 'Active' => {
  if (!alarm) {
    return 'None';
  }

  if (alarm.lifecycleStatus === 'acknowledged') {
    return 'Acknowledged';
  }

  if (['resolved', 'closed', 'cleared'].includes(alarm.lifecycleStatus)) {
    return 'Cleared';
  }

  return 'Active';
};

const parsePulseWidthNs = (pulseWidth?: string | null): number => {
  if (!pulseWidth) {
    return 100;
  }

  const match = pulseWidth.match(/(\d+)/);
  return match ? Number(match[1]) : 100;
};

const buildMlPredictionRows = (
  rtus: BackendRTU[],
  alarms: BackendAlarm[],
  routes: BackendFiberRoute[],
  tests: BackendOtdrTest[],
  stats: DashboardStats | null
): Array<Record<string, unknown>> => {
  return rtus.map((rtu) => {
    const relatedRoutes = routes.filter(
      (route) => route.sourceRtuId === rtu.id || route.destinationRtuId === rtu.id
    );
    const activeAlarms = alarms.filter((alarm) => alarm.rtuId === rtu.id && isActiveAlarm(alarm));
    const highestAlarm = [...activeAlarms].sort((left, right) => {
      const rank = { critical: 3, major: 2, minor: 1, info: 0 };
      return rank[right.severity] - rank[left.severity];
    })[0];
    const relatedRouteNames = new Set(relatedRoutes.map((route) => route.routeName));
    const relevantTests = tests.filter((test) => relatedRouteNames.has(test.routeName));
    const latestTest = relevantTests[0] || tests[0];

    const routeLengths = relatedRoutes
      .map((route) => Number(route.lengthKm || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const lengthKm = Number(average(routeLengths, 12));
    const attenuationValues = relatedRoutes
      .map((route) => Number(route.attenuationDb || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const attenuationDb = Number(average(attenuationValues, stats?.averageAttenuation ?? 3.5).toFixed(3));
    const dynamicRangeDb = Number(latestTest?.dynamicRangeDb ?? 35);
    const wavelengthNm = Number(latestTest?.wavelengthNm ?? 1550);
    const testMode = toMlTestMode(latestTest?.mode);
    const testResult = toMlTestResult(latestTest?.result);
    const fiberStatus = toMlFiberStatus(relatedRoutes);
    const routeStatus = toMlRouteStatus(relatedRoutes);
    const temperature = typeof rtu.temperature === 'number' ? rtu.temperature : 26;
    const alarmCount = activeAlarms.length;
    const uptimePercent = Number(
      clamp(100 - alarmCount * 6 - (normalizeRtuStatus(rtu.status) !== RTUStatus.ONLINE ? 20 : 0), 35, 100).toFixed(1)
    );
    const totalLossDb = attenuationDb;
    const slopeAvgDbKm = Number((lengthKm > 0 ? attenuationDb / lengthKm : 0.22).toFixed(4));
    const spliceLossMax = Number(clamp(attenuationDb / 8, 0.02, 1.5).toFixed(3));
    const endLossDb = Number(clamp(10 + attenuationDb * 0.8, 10, 20).toFixed(3));
    const reflLossMin = Number((-55 + Math.min(alarmCount * 2, 10)).toFixed(3));
    const orlDb = Number(clamp(36 - alarmCount * 1.5, 20, 40).toFixed(3));
    const checksumValid = normalizeRtuStatus(rtu.status) === RTUStatus.ONLINE;
    const primaryDriver =
      highestAlarm?.message ||
      (normalizeRtuStatus(rtu.status) !== RTUStatus.ONLINE ? getStatusLabel(rtu.status) : 'Telemetry profile stable');

    return {
      dashboard_rtu_id: rtu.id,
      dashboard_rtu_name: rtu.name,
      dashboard_location: rtu.locationAddress || 'Localisation inconnue',
      dashboard_nb_alarms_24h: alarmCount,
      dashboard_uptime_percent: uptimePercent,
      dashboard_avg_attenuation: attenuationDb,
      dashboard_primary_driver: primaryDriver,
      dashboard_horizon_hours: alarmCount > 0 ? 24 : 48,
      sample_id: rtu.id,
      rtu_status: toMlRtuStatus(rtu.status),
      power_supply: toMlPowerSupply(rtu.status),
      temperature_c: temperature,
      otdr_avail: toMlOtdrAvailability(rtu.status),
      fiber_status: fiberStatus,
      route_status: routeStatus,
      test_mode: testMode,
      test_result: testResult,
      alarm_type: toMlAlarmType(highestAlarm),
      severity: toMlSeverity(highestAlarm),
      alarm_status: toMlAlarmStatus(highestAlarm),
      supplier: 'EXFO',
      wavelength_nm: wavelengthNm,
      fiber_type: 'G.652',
      pulse_width_ns: parsePulseWidthNs(latestTest?.pulseWidth),
      length_km: lengthKm,
      range_km: Number((lengthKm * 1.15).toFixed(3)),
      resolution_m: 4,
      index_refraction: 1.468,
      attenuation_db: attenuationDb,
      total_loss_db: totalLossDb,
      orl_db: orlDb,
      slope_avg_db_km: slopeAvgDbKm,
      num_events: 5,
      splice_loss_max: spliceLossMax,
      refl_loss_min: reflLossMin,
      end_loss_db: endLossDb,
      num_averages: 32,
      num_data_points: 4000,
      dynamic_range_db: dynamicRangeDb,
      noise_floor: -72,
      user_offset_m: 0,
      build_condition: 'BC (as-built)',
      checksum_valid: checksumValid,
      mttr_hours: 0,
    };
  });
};

const toMlPredictionCards = (rows: Array<Record<string, unknown>>): AiPredictionCard[] =>
  rows
    .map((row) => {
      const probability = Number(row.probability_panne ?? 0);
      const riskLevel = getRiskLevel(probability);

      return {
        id: Number(row.dashboard_rtu_id ?? 0),
        rtuId: Number(row.dashboard_rtu_id ?? 0),
        rtuName: String(row.dashboard_rtu_name ?? 'RTU inconnue'),
        location: String(row.dashboard_location ?? 'Localisation inconnue'),
        probability,
        riskLevel,
        features: {
          attenuationDb: Number(row.dashboard_avg_attenuation ?? 0),
          nbAlarms24h: Number(row.dashboard_nb_alarms_24h ?? 0),
          uptimePercent: Number(row.dashboard_uptime_percent ?? 0),
        },
        primaryDriver: String(row.dashboard_primary_driver ?? 'Modele XGBoost'),
        horizonHours: Number(row.dashboard_horizon_hours ?? 24),
      };
    })
    .sort((left, right) => right.probability - left.probability);

const DashboardIAPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rtus, setRtus] = useState<BackendRTU[]>([]);
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [routes, setRoutes] = useState<BackendFiberRoute[]>([]);
  const [tests, setTests] = useState<BackendOtdrTest[]>([]);
  const [mlPredictions, setMlPredictions] = useState<AiPredictionCard[]>([]);
  const [predictionMode, setPredictionMode] = useState<'ml' | 'fallback'>('fallback');
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setPredictionError(null);

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

        const predictionRows = buildMlPredictionRows(
          rtuData,
          alarmData.data,
          topologyData.routes,
          testData.data,
          statsData
        );

        if (predictionRows.length > 0) {
          try {
            const mlResponse = await postPanneRiskPrediction(predictionRows);

            if (!active) {
              return;
            }

            setMlPredictions(toMlPredictionCards(mlResponse.predictions));
            setPredictionMode(mlResponse.provider === 'xgboost' ? 'ml' : 'fallback');
            setPredictionError(
              mlResponse.provider === 'fallback'
                ? "Le modele Python n'est pas disponible pour le moment. Le backend utilise une estimation de secours."
                : null
            );
          } catch {
            if (!active) {
              return;
            }

            setMlPredictions([]);
            setPredictionMode('fallback');
            setPredictionError("Le backend ML n'a pas repondu. Affichage du score heuristique local.");
          }
        }
      } catch {
        if (!active) {
          return;
        }

        setError('Impossible de charger la telemetrie du tableau de bord IA depuis le backend.');
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

  const summary = useMemo<NetworkSummary>(() => buildNetworkSummaryFromData(alarms, routes, tests), [alarms, routes, tests]);

  const heuristicPredictions = useMemo<AiPredictionCard[]>(() => {
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
        const routePenalty = summary.brokenRoutes > 0 ? Math.min(0.14, summary.brokenRoutes * 0.025) : 0;
        const testPenalty = summary.failedTests > 0 ? Math.min(0.12, summary.failedTests * 0.02) : 0;
        const attenuationPenalty =
          (summary.avgAttenuation ?? 0) > 18 ? Math.min(0.12, ((summary.avgAttenuation ?? 0) - 18) * 0.02) : 0;
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
            label: temperature > 37 ? `Temperature a ${temperature}C` : 'Temperature stable',
            impact: temperaturePenalty,
          },
          {
            label:
              activeAlarmCount > 0
                ? `${activeAlarmCount} alarme active${activeAlarmCount > 1 ? 's' : ''}`
                : 'Aucune alarme active',
            impact: alarmPenalty,
          },
          {
            label:
              summary.brokenRoutes > 0
                ? `${summary.brokenRoutes} route fibre cassee${summary.brokenRoutes > 1 ? 's' : ''}`
                : 'Routes fibre stables',
            impact: routePenalty,
          },
          {
            label:
              summary.failedTests > 0
                ? `${summary.failedTests} echec OTDR recent${summary.failedTests > 1 ? 's' : ''}`
                : 'Tests OTDR conformes',
            impact: testPenalty,
          },
        ];

        const primaryDriverCandidate = driverCandidates.sort((left, right) => right.impact - left.impact)[0];
        const primaryDriver =
          primaryDriverCandidate && primaryDriverCandidate.impact > 0
            ? primaryDriverCandidate.label
            : 'Base de telemetrie stable';

        return {
          id: rtu.id,
          rtuId: rtu.id,
          rtuName: rtu.name,
          location: rtu.locationAddress || 'Localisation inconnue',
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

  const predictions = useMemo<AiPredictionCard[]>(
    () => (predictionMode === 'ml' && mlPredictions.length > 0 ? mlPredictions : heuristicPredictions),
    [heuristicPredictions, mlPredictions, predictionMode]
  );

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
    globalScore >= 85 ? 'Sain' : globalScore >= 70 ? 'Stable' : globalScore >= 50 ? 'Surveillance' : 'Critique';

  const scoreColor =
    globalScore >= 85 ? '#7EE081' : globalScore >= 70 ? '#7CCBFF' : globalScore >= 50 ? '#F7C948' : '#FF4D6D';
  const modelSourceLabel = predictionMode === 'ml' ? 'Modele XGBoost actif' : 'Estimation backend';
  const modelSourceChipColor = predictionMode === 'ml' ? 'rgba(126, 224, 129, 0.18)' : 'rgba(247, 201, 72, 0.18)';

  return (
    <Box>
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Psychology sx={{ fontSize: 40, color: '#9C27B0' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              Tableau de bord IA
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Score de risque en direct alimente par le backend et par le modele XGBoost.
            </Typography>
          </Box>
          <Chip
            icon={<TrendingUpOutlined />}
            label={`${predictions.length} RTU evaluees`}
            sx={{ backgroundColor: 'rgba(124, 203, 255, 0.16)', color: 'white', fontWeight: 'bold' }}
          />
        </Box>
      </Box>

      {loading && (
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Chargement de la telemetrie IA...
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
          Le backend fonctionne en mode degrade ; ces analyses IA reposent sur la telemetrie de demonstration.
        </Alert>
      )}

      {predictionMode === 'ml' && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Les cartes de risque utilisent le modele XGBoost branche au backend.
        </Alert>
      )}

      {predictionError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {predictionError}
        </Alert>
      )}

      {!stats?.degradedMode && !error && stats && (
        <Alert severity="success" sx={{ mb: 2 }}>
          La telemetrie en direct du backend est connectee et alimente ce tableau de bord IA.
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
              Score global de sante du reseau
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
              <Chip label={`RTU ${rtus.length}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} />
              <Chip
                label={`Alarmes ${summary.activeAlarms}`}
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
                  Alertes predictives
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="flex-end">
                <Chip
                  label={modelSourceLabel}
                  size="small"
                  sx={{ backgroundColor: modelSourceChipColor, color: 'white', fontWeight: 'bold' }}
                />
                <Chip
                  label={`${topPredictions.length}/${predictions.length || 0} haute priorite`}
                  sx={{ backgroundColor: 'rgba(255, 77, 109, 0.16)', color: 'white', fontWeight: 'bold' }}
                />
              </Stack>
            </Box>

            {topPredictions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune donnee RTU en direct pour le moment.
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
                      background: `linear-gradient(135deg, ${getRiskColor(prediction.riskLevel)}18 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.02) 100%)`,
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
                          {formatProbabilityDisplay(prediction.probability)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)', display: 'block' }}>
                          risque de panne
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

                    <Box mt={1.4}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                      >
                        Signal principal
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.35, fontWeight: 600 }}>
                        {truncateText(prediction.primaryDriver, 92)}
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={prediction.probability * 100}
                      sx={{
                        mt: 1.6,
                        mb: 1.6,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          backgroundColor: getRiskColor(prediction.riskLevel),
                        },
                      }}
                    />

                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        label={predictionMode === 'ml' ? 'Source : XGBoost' : 'Source : fallback'}
                        size="small"
                        sx={{ backgroundColor: 'rgba(124, 203, 255, 0.16)', color: 'white' }}
                      />
                      <Chip
                        label={getConfidenceLabel(prediction.probability)}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`${prediction.horizonHours}h horizon`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`Attenuation : ${prediction.features.attenuationDb.toFixed(1)} dB`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`Alarmes : ${prediction.features.nbAlarms24h}`}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <Chip
                        label={`Disponibilite : ${prediction.features.uptimePercent.toFixed(1)}%`}
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
                RTU critiques principales
              </Typography>
            </Box>

            {predictions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune telemetrie RTU disponible pour le moment.
              </Typography>
            ) : (
              topPredictions.map((prediction, index) => (
                <Box key={prediction.id} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" color="white">
                      {index + 1}. {prediction.rtuName}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color="white">
                      {formatProbabilityDisplay(prediction.probability)}
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
