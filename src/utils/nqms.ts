import { DashboardStats } from '../types';
import {
  BackendAlarm,
  BackendFiberRoute,
  BackendOtdrTest,
  BackendRTU,
} from '../services/api';

export type NqmsStatus = 'ok' | 'warning' | 'critical';

export type NqmsCriticality = 'Low' | 'Medium' | 'High' | 'Critical';

export interface NqmsMetrics {
  totalRtus: number;
  onlineRtus: number;
  offlineRtus: number;
  warningRtus: number;
  unreachableRtus: number;
  totalRoutes: number;
  brokenRoutes: number;
  degradedRoutes: number;
  totalTests: number;
  failedTests: number;
  activeAlarms: number;
  criticalAlarms: number;
  rtuAvailability: number;
  averageTemperature: number;
  averageAttenuation: number;
  lossRate: number;
  otdrFailRate: number;
  mttr: number;
  mtbf: number;
  networkAvailability: number;
}

export interface NqmsMatrixRow {
  domain: string;
  parameter: string;
  measuredValue: string;
  targetValue: string;
  status: NqmsStatus;
  widget: string;
  criticality: NqmsCriticality;
  rule: string;
}

export interface NqmsMethodologyCard {
  title: string;
  summary: string;
  bullets: string[];
}

export const NQMS_THRESHOLDS = {
  rtuAvailability: { target: 99, warningMargin: 1 },
  temperatureC: { target: 40, warningMargin: 5 },
  attenuationDb: { target: 18, warningMargin: 2 },
  lossRatePercent: { target: 5, warningMargin: 0.1 },
  criticalAlarms: { target: 0, warningMargin: 1 },
  otdrFailRatePercent: { target: 10, warningMargin: 5 },
  mttrHours: { target: 4, warningMargin: 1 },
  mtbfHours: { target: 100, warningMargin: 20 },
  networkAvailabilityPercent: { target: 99, warningMargin: 0.5 },
  attenuationBaselineDb: 3,
} as const;

export const NQMS_METHODOLOGY: NqmsMethodologyCard[] = [
  {
    title: 'Algorithme de détection',
    summary:
      "Le tableau de bord calcule chaque statut à partir de la valeur mesurée et d'un seuil fixe, puis classe le résultat en OK, Avertissement ou Critique.",
    bullets: [
      'Disponibilité RTU = RTU en ligne / RTU totales.',
      'La température passe en avertissement au-dessus de 40 °C et en critique au-dessus de 45 °C.',
      'Le taux de perte est normalisé par rapport à une référence de 3 dB avant comparaison au seuil projet de 5 %.',
      "La disponibilité réseau est dérivée de l'état des routes, des alarmes ouvertes et des échecs OTDR.",
    ],
  },
  {
    title: 'ITU-T G.652',
    summary:
      'G.652 is the reference standard for the single-mode fiber used in the project topology.',
    bullets: [
      "Elle fournit la base technique pour la qualité de lien et l'interprétation de l'atténuation.",
      "Nous l'utilisons comme référence normative pour documenter les seuils optiques.",
      "Les routes qui dépassent le seuil d'atténuation du projet sont signalées dans la matrice.",
    ],
  },
  {
    title: 'Bellcore GR-196 / SOR',
    summary:
      "Les traces OTDR sont documentées au format standard SOR afin de conserver des mesures portables d'un outil à l'autre.",
    bullets: [
      "Les fichiers SOR stockent la trace OTDR, la table d'événements, les distances et les pertes.",
      "Le format garde les traces lisibles entre différents constructeurs et outils d'analyse.",
      'La page des rapports résume les compteurs réussite/échec extraits des résultats OTDR.',
    ],
  },
];

const roundOne = (value: number): number => Number(value.toFixed(1));

const safeAverage = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const isClosedAlarm = (status?: string | null): boolean =>
  status === 'cleared' || status === 'resolved' || status === 'closed';

const statusLowerIsBetter = (value: number, target: number, warningMargin: number): NqmsStatus => {
  if (value <= target) {
    return 'ok';
  }
  if (value <= target + warningMargin) {
    return 'warning';
  }
  return 'critical';
};

const statusHigherIsBetter = (value: number, target: number, warningMargin: number): NqmsStatus => {
  if (value >= target) {
    return 'ok';
  }
  if (value >= target - warningMargin) {
    return 'warning';
  }
  return 'critical';
};

export const getNqmsStatusLabel = (status: NqmsStatus): string => {
  switch (status) {
    case 'warning':
      return 'Avertissement';
    case 'critical':
      return 'Critique';
    default:
      return 'OK';
  }
};

export const getNqmsStatusColor = (status: NqmsStatus): string => {
  switch (status) {
    case 'warning':
      return '#ffb96b';
    case 'critical':
      return '#ff5c84';
    default:
      return '#6ddf9e';
  }
};

export const calculateNqmsMetrics = (params: {
  stats: DashboardStats | null;
  rtus: BackendRTU[];
  routes: BackendFiberRoute[];
  otdrTests: BackendOtdrTest[];
  alarms: BackendAlarm[];
}): NqmsMetrics => {
  const { stats, rtus, routes, otdrTests, alarms } = params;

  const totalRtus = rtus.length;
  const onlineRtus = rtus.filter((rtu) => rtu.status === 'online').length;
  const offlineRtus = rtus.filter((rtu) => rtu.status === 'offline').length;
  const warningRtus = rtus.filter((rtu) => rtu.status === 'warning').length;
  const unreachableRtus = rtus.filter((rtu) => rtu.status === 'unreachable').length;
  const rtuAvailability = totalRtus > 0 ? roundOne((onlineRtus / totalRtus) * 100) : 0;

  const temperatureValues = rtus
    .map((rtu) => (typeof rtu.temperature === 'number' ? rtu.temperature : null))
    .filter((value): value is number => value !== null);
  const averageTemperature = roundOne(safeAverage(temperatureValues));

  const validRouteAttenuations = routes
    .map((route) => (typeof route.attenuationDb === 'number' && route.attenuationDb > 0 ? route.attenuationDb : null))
    .filter((value): value is number => value !== null);
  const averageAttenuationRaw = safeAverage(validRouteAttenuations);
  const averageAttenuation = roundOne(averageAttenuationRaw);

  const brokenRoutes = routes.filter((route) => route.fiberStatus === 'broken').length;
  const degradedRoutes = routes.filter((route) => route.fiberStatus === 'degraded').length;
  const totalRoutes = routes.length;

  const openAlarms = alarms.filter((alarm) => !isClosedAlarm(alarm.lifecycleStatus));
  const activeAlarms = openAlarms.length;
  const criticalAlarms = openAlarms.filter((alarm) => alarm.severity === 'critical').length;

  const totalTests = otdrTests.length;
  const failedTests = otdrTests.filter((test) => test.result === 'fail').length;
  const otdrFailRate = totalTests > 0 ? roundOne((failedTests / totalTests) * 100) : 0;

  const lossRate = averageAttenuationRaw > 0
    ? roundOne((averageAttenuationRaw / NQMS_THRESHOLDS.attenuationBaselineDb) * 100)
    : 0;

  const networkAvailability = totalRoutes > 0
    ? roundOne(
        Math.max(
          0,
          100 -
            brokenRoutes * 0.4 -
            degradedRoutes * 0.1 -
            criticalAlarms * 0.05 -
            failedTests * 0.05
        )
      )
    : 0;

  const incidentLoad = Math.max(1, criticalAlarms + brokenRoutes + degradedRoutes + failedTests);
  const mtbf = totalRoutes > 0 ? roundOne((networkAvailability * totalRoutes) / incidentLoad) : 0;
  const mttr = typeof stats?.mttr === 'number' ? roundOne(stats.mttr) : 0;

  return {
    totalRtus,
    onlineRtus,
    offlineRtus,
    warningRtus,
    unreachableRtus,
    totalRoutes,
    brokenRoutes,
    degradedRoutes,
    totalTests,
    failedTests,
    activeAlarms,
    criticalAlarms,
    rtuAvailability,
    averageTemperature,
    averageAttenuation,
    lossRate,
    otdrFailRate,
    mttr,
    mtbf,
    networkAvailability,
  };
};

export const buildNqmsMatrixRows = (metrics: NqmsMetrics): NqmsMatrixRow[] => [
  {
    domain: 'RTU',
    parameter: 'Availability',
    measuredValue: `${metrics.rtuAvailability.toFixed(1)}% (${metrics.onlineRtus}/${metrics.totalRtus} online)`,
    targetValue: `> ${NQMS_THRESHOLDS.rtuAvailability.target}%`,
    status: statusHigherIsBetter(
      metrics.rtuAvailability,
      NQMS_THRESHOLDS.rtuAvailability.target,
      NQMS_THRESHOLDS.rtuAvailability.warningMargin
    ),
    widget: 'Tile / KPI',
    criticality: 'High',
    rule: 'online RTUs / total RTUs',
  },
  {
    domain: 'RTU',
    parameter: 'Temperature',
    measuredValue: `${metrics.averageTemperature.toFixed(1)} C`,
    targetValue: `< ${NQMS_THRESHOLDS.temperatureC.target} C`,
    status: statusLowerIsBetter(
      metrics.averageTemperature,
      NQMS_THRESHOLDS.temperatureC.target,
      NQMS_THRESHOLDS.temperatureC.warningMargin
    ),
    widget: 'Tile',
    criticality: 'Medium',
    rule: 'mean RTU temperature',
  },
  {
    domain: 'Fiber',
    parameter: 'Attenuation',
    measuredValue: `${metrics.averageAttenuation.toFixed(1)} dB`,
    targetValue: `< ${NQMS_THRESHOLDS.attenuationDb.target} dB`,
    status: statusLowerIsBetter(
      metrics.averageAttenuation,
      NQMS_THRESHOLDS.attenuationDb.target,
      NQMS_THRESHOLDS.attenuationDb.warningMargin
    ),
    widget: 'Gauge',
    criticality: 'High',
    rule: 'mean route attenuation',
  },
  {
    domain: 'Fiber',
    parameter: 'Loss Rate',
    measuredValue: `${metrics.lossRate.toFixed(1)}%`,
    targetValue: `< ${NQMS_THRESHOLDS.lossRatePercent.target}%`,
    status: statusLowerIsBetter(
      metrics.lossRate,
      NQMS_THRESHOLDS.lossRatePercent.target,
      NQMS_THRESHOLDS.lossRatePercent.warningMargin
    ),
    widget: 'Trend',
    criticality: 'High',
    rule: 'average attenuation / 3 dB baseline',
  },
  {
    domain: 'Alarms',
    parameter: 'Critical Alarms',
    measuredValue: `${metrics.criticalAlarms} active`,
    targetValue: `${NQMS_THRESHOLDS.criticalAlarms.target} active`,
    status: statusLowerIsBetter(
      metrics.criticalAlarms,
      NQMS_THRESHOLDS.criticalAlarms.target,
      NQMS_THRESHOLDS.criticalAlarms.warningMargin
    ),
    widget: 'List',
    criticality: 'Critical',
    rule: 'open critical alarm count',
  },
  {
    domain: 'OTDR',
    parameter: 'Fail Rate',
    measuredValue: `${metrics.otdrFailRate.toFixed(1)}% (${metrics.failedTests}/${metrics.totalTests})`,
    targetValue: `< ${NQMS_THRESHOLDS.otdrFailRatePercent.target}%`,
    status: statusLowerIsBetter(
      metrics.otdrFailRate,
      NQMS_THRESHOLDS.otdrFailRatePercent.target,
      NQMS_THRESHOLDS.otdrFailRatePercent.warningMargin
    ),
    widget: 'Table',
    criticality: 'High',
    rule: 'failed OTDR tests / total tests',
  },
  {
    domain: 'Performance',
    parameter: 'MTTR',
    measuredValue: `${metrics.mttr.toFixed(1)} h`,
    targetValue: `< ${NQMS_THRESHOLDS.mttrHours.target} h`,
    status: statusLowerIsBetter(
      metrics.mttr,
      NQMS_THRESHOLDS.mttrHours.target,
      NQMS_THRESHOLDS.mttrHours.warningMargin
    ),
    widget: 'KPI',
    criticality: 'Medium',
    rule: 'mean time to repair from cleared alarms',
  },
  {
    domain: 'Performance',
    parameter: 'MTBF',
    measuredValue: `${metrics.mtbf.toFixed(1)} h`,
    targetValue: `> ${NQMS_THRESHOLDS.mtbfHours.target} h`,
    status: statusHigherIsBetter(
      metrics.mtbf,
      NQMS_THRESHOLDS.mtbfHours.target,
      NQMS_THRESHOLDS.mtbfHours.warningMargin
    ),
    widget: 'KPI',
    criticality: 'Medium',
    rule: 'network availability x route count / incident load',
  },
  {
    domain: 'Réseau Global',
    parameter: 'Availability',
    measuredValue: `${metrics.networkAvailability.toFixed(1)}%`,
    targetValue: `> ${NQMS_THRESHOLDS.networkAvailabilityPercent.target}%`,
    status: statusHigherIsBetter(
      metrics.networkAvailability,
      NQMS_THRESHOLDS.networkAvailabilityPercent.target,
      NQMS_THRESHOLDS.networkAvailabilityPercent.warningMargin
    ),
    widget: 'KPI',
    criticality: 'Critical',
    rule: '100 - route/alarm/OTDR penalties',
  },
];


