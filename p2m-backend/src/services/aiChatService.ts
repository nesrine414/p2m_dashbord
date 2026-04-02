import { Alarm, Fibre, Measurement, RTU } from '../models';
import { databaseState } from '../config/database';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';

type ChatSeverity = 'info' | 'warning' | 'critical';
type ChatScope = 'global' | 'alarm' | 'rtu' | 'route';
type AlarmSeverityFilter = 'critical' | 'major' | 'minor' | 'info' | null;
type GroqMode = 'grounded' | 'general';

export interface AiChatResponsePayload {
  reply: string;
  suggestions: string[];
  degradedMode: boolean;
  provider: 'groq' | 'fallback';
  context: {
    matchedRtu?: string;
    matchedAlarm?: string;
    matchedRoute?: string;
    counts: {
      rtus: number;
      activeAlarms: number;
      brokenRoutes: number;
      failedOtdrTests: number;
    };
  };
}

interface ChatContext {
  rtus: Array<{
    id: number;
    name: string;
    locationAddress: string | null;
    status: string;
    temperature: number | null;
    lastSeen: string | null;
  }>;
  alarms: Array<{
    id: number;
    rtuId: number | null;
    routeId: number | null;
    severity: string;
    lifecycleStatus: string;
    alarmType: string;
    message: string;
    location: string | null;
    localizationKm: string | null;
    occurredAt: string | null;
  }>;
  routes: Array<{
    id: number;
    routeName: string;
    source: string;
    destination: string;
    fiberStatus: string;
    attenuationDb: number | null;
    lastTestTime: string | null;
  }>;
  otdrTests: Array<{
    id: number;
    routeId: number | null;
    routeName: string;
    result: string;
    testedAt: string | null;
    dynamicRangeDb: number | null;
  }>;
  degradedMode: boolean;
}

interface GroundingPayload {
  scope: ChatScope;
  targetLabel?: string;
  facts: Record<string, unknown>;
  allowedEntityNames: string[];
}

const ACTIVE_ALARM_STATUSES = new Set(['active', 'acknowledged']);
const normalize = (value: string): string => value.toLowerCase().trim();
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 60000);
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_ONLY_ERROR = 'GROQ_RESPONSE_UNAVAILABLE';

const includesNormalized = (haystack: string | null | undefined, needle: string): boolean => {
  if (!haystack) {
    return false;
  }

  return normalize(haystack).includes(normalize(needle));
};

const isAlarmActive = (status: string): boolean => ACTIVE_ALARM_STATUSES.has(normalize(status));

const hasAlarmIntent = (message: string): boolean =>
  ['alarme', 'alarm', 'incident', 'event'].some((keyword) => includesNormalized(message, keyword));

const hasRtuIntent = (message: string): boolean =>
  ['rtu', 'sonde', 'equipment', 'equipement'].some((keyword) => includesNormalized(message, keyword));

const hasRouteIntent = (message: string): boolean =>
  ['route', 'fibre', 'fiber', 'cable', 'liaison'].some((keyword) => includesNormalized(message, keyword));

const hasUnavailableRtuIntent = (message: string): boolean =>
  ['injoignable', 'unreachable', 'hors ligne', 'offline', 'ne repond pas', 'down'].some((keyword) =>
    includesNormalized(message, keyword)
  );

const hasBrokenRouteIntent = (message: string): boolean =>
  ['cassée', 'cassee', 'broken', 'coupee', 'coupure', 'perte'].some((keyword) => includesNormalized(message, keyword));

const hasProjectIntent = (message: string): boolean =>
  [
    hasAlarmIntent(message),
    hasRtuIntent(message),
    hasRouteIntent(message),
    ['otdr', 'nqms', 'supervision', 'rapport', 'report', 'dashboard', 'reseau', 'réseau', 'fibre', 'fiber'].some(
      (keyword) => includesNormalized(message, keyword)
    ),
  ].some(Boolean);

const hasAlarmCountIntent = (message: string): boolean =>
  ['combien', 'nombre', 'count', 'total'].some((keyword) => includesNormalized(message, keyword)) &&
  ['alarme', 'alarm'].some((keyword) => includesNormalized(message, keyword));

const getAlarmSeverityFilter = (message: string): AlarmSeverityFilter => {
  if (['critique', 'critical'].some((keyword) => includesNormalized(message, keyword))) {
    return 'critical';
  }

  if (['majeure', 'majeur', 'major'].some((keyword) => includesNormalized(message, keyword))) {
    return 'major';
  }

  if (['mineure', 'mineur', 'minor'].some((keyword) => includesNormalized(message, keyword))) {
    return 'minor';
  }

  if (['info', 'information'].some((keyword) => includesNormalized(message, keyword))) {
    return 'info';
  }

  return null;
};

const isGreetingMessage = (message: string): boolean => {
  const normalizedMessage = normalize(message)
    .replace(/[!?.،,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return ['salut', 'bonjour', 'bonsoir', 'hello', 'hi'].includes(normalizedMessage);
};

const formatDisplayName = (username: string): string => {
  const cleaned = username.trim();
  if (!cleaned || cleaned === 'anonymous') {
    return 'bonjour';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const getSeverityLabel = (severity: ChatSeverity): string => {
  switch (severity) {
    case 'critical':
      return 'Critique';
    case 'warning':
      return 'A surveiller';
    default:
      return 'Info';
  }
};

const getPriorityLabel = (severity: ChatSeverity): string => {
  switch (severity) {
    case 'critical':
      return 'Haute';
    case 'warning':
      return 'Moyenne';
    default:
      return 'Normale';
  }
};

const formatTechnicianReply = (sections: Array<{ title: string; content: string }>): string =>
  sections
    .filter((section) => section.content.trim().length > 0)
    .map((section) => `${section.title}\n${section.content}`)
    .join('\n\n');

const toIsoOrFallback = (value: string | null): string => value || 'non disponible';

const buildRouteName = (rtuName: string, fibreName: string): string => `${rtuName}-${fibreName}`;

const buildSuggestions = (matchedRtu?: string, matchedAlarm?: string, matchedRoute?: string): string[] => {
  const suggestions = [
    'Donne-moi une checklist terrain en 5 etapes.',
    'Resume la situation pour un ticket NOC.',
    'Quelles sont les causes probables ?',
  ];

  if (matchedRtu) {
    suggestions.unshift(`Quels controles faire sur ${matchedRtu} ?`);
  }

  if (matchedAlarm) {
    suggestions.unshift(`Explique cette alarme: ${matchedAlarm}`);
  }

  if (matchedRoute) {
    suggestions.unshift(`Quelle action recommandes-tu sur la route ${matchedRoute} ?`);
  }

  return suggestions.slice(0, 4);
};

const buildAlarmCountReply = (context: ChatContext, message: string): string => {
  const severityFilter = getAlarmSeverityFilter(message);
  const activeOnly =
    ['active', 'actives', 'ouverte', 'ouvertes', 'encore ouvertes'].some((keyword) => includesNormalized(message, keyword)) ||
    !['resolved', 'resolues', 'closed', 'fermees', 'fermées'].some((keyword) => includesNormalized(message, keyword));

  const filtered = context.alarms.filter((alarm) => {
    const severityMatch = !severityFilter || alarm.severity === severityFilter;
    const statusMatch = activeOnly ? isAlarmActive(alarm.lifecycleStatus) : true;
    return severityMatch && statusMatch;
  });

  const severityLabel =
    severityFilter === 'critical'
      ? 'critiques'
      : severityFilter === 'major'
        ? 'majeures'
        : severityFilter === 'minor'
          ? 'mineures'
          : severityFilter === 'info'
            ? 'informatives'
            : '';

  return formatTechnicianReply([
    {
      title: 'Comptage',
      content: severityLabel
        ? `Il y a ${filtered.length} alarmes ${severityLabel}${activeOnly ? ' actives' : ''}.`
        : `Il y a ${filtered.length} alarmes${activeOnly ? ' actives' : ''}.`,
    },
    {
      title: 'Source',
      content: context.degradedMode
        ? 'Valeur calculee a partir des donnees de demonstration.'
        : 'Valeur calculee directement a partir des alarmes en base.',
    },
  ]);
};

const buildGreetingReply = (username: string): string =>
  `Bonjour ${formatDisplayName(username)}, en quoi puis-je vous aider aujourd'hui ?`;

const getAlarmPriorityScore = (alarm: ChatContext['alarms'][number]): number => {
  const severityScore =
    alarm.severity === 'critical' ? 300 : alarm.severity === 'major' ? 200 : alarm.severity === 'minor' ? 100 : 0;
  const statusScore = isAlarmActive(alarm.lifecycleStatus) ? 50 : 0;
  const dateScore = alarm.occurredAt ? new Date(alarm.occurredAt).getTime() / 1_000_000_000_000 : 0;
  return severityScore + statusScore + dateScore;
};

const getRtuPriorityScore = (rtu: ChatContext['rtus'][number]): number => {
  const statusScore =
    rtu.status === 'unreachable' ? 300 : rtu.status === 'offline' ? 250 : rtu.status === 'warning' ? 150 : 0;
  const tempScore = rtu.temperature ?? 0;
  return statusScore + tempScore;
};

const getRoutePriorityScore = (route: ChatContext['routes'][number]): number => {
  const statusScore = route.fiberStatus === 'broken' ? 300 : route.fiberStatus === 'degraded' ? 180 : 0;
  const attenuationScore = route.attenuationDb ?? 0;
  return statusScore + attenuationScore;
};

const buildContextDigest = (context: ChatContext): string => {
  const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus));
  const topAlarmLines = activeAlarms
    .slice(0, 5)
    .map((alarm) => `- ${alarm.alarmType} | severity=${alarm.severity} | location=${alarm.location || 'N/A'} | status=${alarm.lifecycleStatus}`);
  const topRouteLines = context.routes
    .filter((route) => route.fiberStatus !== 'normal')
    .slice(0, 5)
    .map((route) => `- ${route.routeName} | fiber=${route.fiberStatus} | attenuation=${route.attenuationDb ?? 0} dB`);
  const topRtuLines = context.rtus
    .filter((rtu) => rtu.status !== 'online')
    .slice(0, 5)
    .map((rtu) => `- ${rtu.name} | status=${rtu.status} | temp=${rtu.temperature ?? 0} C | site=${rtu.locationAddress || 'N/A'}`);

  return [
    `RTUs total=${context.rtus.length}`,
    `Active alarms=${activeAlarms.length}`,
    `Broken routes=${context.routes.filter((route) => route.fiberStatus === 'broken').length}`,
    `Failed OTDR tests=${context.otdrTests.filter((test) => test.result === 'fail').length}`,
    'Priority RTUs:',
    ...(topRtuLines.length > 0 ? topRtuLines : ['- none']),
    'Priority routes:',
    ...(topRouteLines.length > 0 ? topRouteLines : ['- none']),
    'Priority alarms:',
    ...(topAlarmLines.length > 0 ? topAlarmLines : ['- none']),
  ].join('\n');
};

const buildGroundingPayload = (params: {
  context: ChatContext;
  scope: ChatScope;
  matchedRtu?: ChatContext['rtus'][number] | null;
  matchedAlarm?: ChatContext['alarms'][number] | null;
  matchedRoute?: ChatContext['routes'][number] | null;
}): GroundingPayload => {
  const { context, scope, matchedAlarm, matchedRoute, matchedRtu } = params;

  if (scope === 'alarm' && matchedAlarm) {
    const relatedRtu = context.rtus.find((rtu) => rtu.id === matchedAlarm.rtuId) || null;
    const relatedRoute = context.routes.find((route) => route.id === matchedAlarm.routeId) || null;
    const relatedTests = context.otdrTests.filter((test) => test.routeId === matchedAlarm.routeId).slice(0, 3);

    return {
      scope,
      targetLabel: `${matchedAlarm.alarmType} #${matchedAlarm.id}`,
      facts: {
        alarm: matchedAlarm,
        relatedRtu,
        relatedRoute,
        recentOtdrTests: relatedTests,
      },
      allowedEntityNames: [
        matchedAlarm.alarmType,
        matchedAlarm.location || '',
        relatedRtu?.name || '',
        relatedRoute?.routeName || '',
        relatedRoute?.source || '',
        relatedRoute?.destination || '',
      ].filter(Boolean),
    };
  }

  if (scope === 'rtu' && matchedRtu) {
    const relatedAlarms = context.alarms
      .filter((alarm) => alarm.rtuId === matchedRtu.id)
      .map((alarm) => ({
        id: alarm.id,
        alarmType: alarm.alarmType,
        severity: alarm.severity,
        lifecycleStatus: alarm.lifecycleStatus,
        message: alarm.message,
        location: alarm.location,
      }))
      .slice(0, 5);
    const relatedRouteIds = new Set(
      context.alarms
        .filter((alarm) => alarm.rtuId === matchedRtu.id)
        .map((alarm) => alarm.routeId)
        .filter((routeId): routeId is number => routeId !== null)
    );
    const relatedTests = context.otdrTests
      .filter((test) => test.routeId !== null && relatedRouteIds.has(test.routeId))
      .slice(0, 5);

    return {
      scope,
      targetLabel: matchedRtu.name,
      facts: {
        rtu: matchedRtu,
        relatedAlarms,
        relatedOtdrTests: relatedTests,
      },
      allowedEntityNames: [matchedRtu.name, matchedRtu.locationAddress || ''].filter(Boolean),
    };
  }

  if (scope === 'route' && matchedRoute) {
    const relatedAlarms = context.alarms
      .filter((alarm) => alarm.routeId === matchedRoute.id)
      .map((alarm) => ({
        id: alarm.id,
        alarmType: alarm.alarmType,
        severity: alarm.severity,
        lifecycleStatus: alarm.lifecycleStatus,
        message: alarm.message,
        rtuId: alarm.rtuId,
      }))
      .slice(0, 5);
    const relatedTests = context.otdrTests.filter((test) => test.routeId === matchedRoute.id).slice(0, 5);

    return {
      scope,
      targetLabel: matchedRoute.routeName,
      facts: {
        route: matchedRoute,
        relatedAlarms,
        relatedOtdrTests: relatedTests,
      },
      allowedEntityNames: [matchedRoute.routeName, matchedRoute.source, matchedRoute.destination].filter(Boolean),
    };
  }

  return {
    scope: 'global',
    targetLabel: 'global',
    facts: {
      summary: {
        totalRtus: context.rtus.length,
        activeAlarms: context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length,
        criticalAlarms: context.alarms.filter(
          (alarm) => alarm.severity === 'critical' && isAlarmActive(alarm.lifecycleStatus)
        ).length,
        brokenRoutes: context.routes.filter((route) => route.fiberStatus === 'broken').length,
        failedOtdrTests: context.otdrTests.filter((test) => test.result === 'fail').length,
      },
      topOfflineRtus: context.rtus
        .filter((rtu) => rtu.status === 'offline' || rtu.status === 'unreachable')
        .slice(0, 5),
      topProblemRoutes: context.routes.filter((route) => route.fiberStatus !== 'normal').slice(0, 5),
      topActiveAlarms: context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).slice(0, 5),
    },
    allowedEntityNames: [],
  };
};

const isGroqReplyGrounded = (reply: string, grounding: GroundingPayload, context: ChatContext): boolean => {
  if (grounding.scope === 'global') {
    return true;
  }

  const normalizedReply = normalize(reply);
  const allowedNames = grounding.allowedEntityNames
    .map((value) => value.trim())
    .filter((value) => value.length >= 4)
    .map((value) => normalize(value));

  const knownEntityNames = [
    ...context.rtus.map((rtu) => rtu.name),
    ...context.routes.map((route) => route.routeName),
    ...context.routes.map((route) => route.source),
    ...context.routes.map((route) => route.destination),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length >= 4);

  return knownEntityNames.every((entityName) => {
    const normalizedEntityName = normalize(entityName);

    if (!normalizedReply.includes(normalizedEntityName)) {
      return true;
    }

    return allowedNames.includes(normalizedEntityName);
  });
};

const generateGroqReply = async (params: {
  message: string;
  context: ChatContext;
  fallbackReply: string;
  grounding: GroundingPayload;
  mode?: GroqMode;
  username?: string;
}): Promise<string | null> => {
  if (AI_PROVIDER !== 'groq' || !GROQ_API_KEY.trim()) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          ...(params.mode === 'general'
            ? [
                {
                  role: 'system' as const,
                  content: [
                    'You are a helpful conversational assistant embedded in an NQMS supervision dashboard.',
                    'Answer in natural French unless the user writes in another language.',
                    'You can answer general questions like a regular chat assistant.',
                    'If the question is not about the project, answer normally and clearly.',
                    'If the user asks about telecom, fiber, alarms, RTU, OTDR or the dashboard, stay practical and concise.',
                  ].join(' '),
                },
              ]
            : [
                {
                  role: 'system' as const,
                  content: [
                    'You are NQMS, a telecom fiber supervision assistant for field technicians.',
                    'Answer in clear operational French.',
                    'Your job is to rewrite the deterministic analysis using only the allowed facts.',
                    'Do not invent entities, counts, causes, metrics, sites or actions that are not present in the allowed facts or deterministic analysis.',
                    'If a fact is missing, say: information non disponible dans les donnees actuelles.',
                    'Prefer short and useful wording over generic explanations.',
                    'If you use a technical term, explain it briefly in simple language.',
                    'Use this structure whenever possible:',
                    'Diagnostic',
                    'Causes probables',
                    'Verifications terrain',
                    'Action immediate',
                    'Keep the answer under 8 short paragraphs or bullet-like blocks.',
                    'Never mention a route, RTU or alarm that is not present in the allowed facts.',
                  ].join(' '),
                },
              ]),
          {
            role: 'user',
            content: [
              `Question: ${params.message}`,
              ...(params.mode === 'general'
                ? [
                    `User: ${params.username || 'anonymous'}`,
                    '',
                    'Answer this like a regular assistant.',
                  ]
                : [
                    `Scope: ${params.grounding.scope}`,
                    `Target: ${params.grounding.targetLabel || 'global'}`,
                    '',
                    'Allowed facts (JSON):',
                    JSON.stringify(params.grounding.facts, null, 2),
                    '',
                    'Deterministic analysis to preserve:',
                    params.fallbackReply,
                    '',
                    'Return a practical grounded answer for a technician in the field.',
                  ]),
            ].join('\n'),
          },
        ],
        temperature: 0.1,
        max_tokens: 280,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
  const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    if (params.mode === 'general') {
      return content;
    }

    return isGroqReplyGrounded(content, params.grounding, params.context) ? content : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const requireGroqReply = async (params: {
  message: string;
  context: ChatContext;
  fallbackReply: string;
  grounding: GroundingPayload;
  mode?: GroqMode;
  username?: string;
}): Promise<string> => {
  const groqReply = await generateGroqReply(params);

  if (!groqReply) {
    throw new Error(GROQ_ONLY_ERROR);
  }

  return groqReply;
};

const buildGlobalReply = (context: ChatContext): string => {
  const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length;
  const criticalAlarms = context.alarms.filter(
    (alarm) => alarm.severity === 'critical' && isAlarmActive(alarm.lifecycleStatus)
  ).length;
  const brokenRoutes = context.routes.filter((route) => route.fiberStatus === 'broken').length;
  const failedTests = context.otdrTests.filter((test) => test.result === 'fail').length;
  const offlineRtus = context.rtus.filter((rtu) => rtu.status === 'offline' || rtu.status === 'unreachable').length;
  const topOfflineRtus = context.rtus
    .filter((rtu) => rtu.status === 'offline' || rtu.status === 'unreachable')
    .slice(0, 3)
    .map((rtu) => rtu.name)
    .join(', ');
  const topBrokenRoutes = context.routes
    .filter((route) => route.fiberStatus === 'broken')
    .slice(0, 3)
    .map((route) => route.routeName)
    .join(', ');

  return formatTechnicianReply([
    {
      title: 'Diagnostic',
      content: `${criticalAlarms} alarmes critiques actives, ${brokenRoutes} routes cassees, ${failedTests} tests OTDR en echec et ${offlineRtus} RTU indisponibles.`,
    },
    {
      title: 'Priorite',
      content:
        activeAlarms > 0
          ? "Traiter d'abord les routes cassees et les RTU hors ligne, puis verifier les pertes optiques anormales."
          : 'Aucune alerte majeure detectee. Maintenir une verification preventive.',
    },
    {
      title: 'Verifications terrain',
      content:
        'Verifier alimentation, lien reseau, dernier test OTDR et coherence entre alarmes ouvertes et etat reel du site.',
    },
    {
      title: 'Elements a surveiller',
      content: [
        topBrokenRoutes ? `Routes critiques: ${topBrokenRoutes}.` : '',
        topOfflineRtus ? `RTU hors ligne ou injoignables: ${topOfflineRtus}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      title: 'Source',
      content: context.degradedMode
        ? 'Mode demonstration: reponse basee sur les donnees mock du projet.'
        : 'Reponse basee sur les donnees actuelles de la base PostgreSQL.',
    },
  ]);
};

const buildRtuReply = (
  rtu: ChatContext['rtus'][number],
  relatedAlarms: ChatContext['alarms'],
  relatedTests: ChatContext['otdrTests']
): { severity: ChatSeverity; text: string } => {
  const activeRelatedAlarms = relatedAlarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus));
  const failedTests = relatedTests.filter((test) => test.result === 'fail');

  let severity: ChatSeverity = 'info';
  if (rtu.status === 'offline' || rtu.status === 'unreachable' || activeRelatedAlarms.some((alarm) => alarm.severity === 'critical')) {
    severity = 'critical';
  } else if (rtu.status === 'warning' || (rtu.temperature ?? 0) >= 40 || failedTests.length > 0) {
    severity = 'warning';
  }

  return {
    severity,
    text: formatTechnicianReply([
      {
        title: 'Diagnostic',
        content: `${getSeverityLabel(severity)}. RTU ${rtu.name} en statut ${rtu.status}. Temperature ${rtu.temperature ?? 0} C. Dernier contact ${toIsoOrFallback(rtu.lastSeen)}.`,
      },
      {
        title: 'Impact',
        content: `${activeRelatedAlarms.length} alarmes actives liees et ${failedTests.length} tests OTDR en echec sur le perimetre associe.`,
      },
      {
        title: 'Causes probables',
        content:
          "Coupure d'alimentation, perte reseau locale, module optique instable ou echauffement anormal de l'equipement.",
      },
      {
        title: 'Action immediate',
        content: `Priorite ${getPriorityLabel(severity)}. Verifier alimentation, ping IP, module optique et reprise de communication sur ${rtu.locationAddress || 'le site concerne'}.`,
      },
    ]),
  };
};

const buildAlarmReply = (
  alarm: ChatContext['alarms'][number],
  relatedRtu: ChatContext['rtus'][number] | undefined,
  relatedRoute: ChatContext['routes'][number] | undefined
): { severity: ChatSeverity; text: string } => {
  const severity: ChatSeverity = alarm.severity === 'critical' ? 'critical' : alarm.severity === 'major' ? 'warning' : 'info';

  return {
    severity,
    text: formatTechnicianReply([
      {
        title: 'Diagnostic',
        content: `${getSeverityLabel(severity)}. Alarme ${alarm.alarmType} en statut ${alarm.lifecycleStatus}. Message: ${alarm.message}.`,
      },
      {
        title: 'Zone concernee',
        content: `Zone ${alarm.location || relatedRtu?.locationAddress || 'non precisee'}. Localisation ${alarm.localizationKm || 'N/A'}.`,
      },
      {
        title: 'Causes probables',
        content: relatedRoute
          ? `Verifier la route ${relatedRoute.routeName}, actuellement en etat ${relatedRoute.fiberStatus}, ainsi que la RTU et les raccordements associes.`
          : "Verifier la source locale de l'alarme, l'etat du lien et les derniers changements sur site.",
      },
      {
        title: 'Action immediate',
        content:
          "Confirmer la source, isoler l'impact reel, controler la section terrain et documenter l'intervention dans le ticket.",
      },
    ]),
  };
};

const buildRouteReply = (
  route: ChatContext['routes'][number],
  relatedAlarms: ChatContext['alarms'],
  relatedTests: ChatContext['otdrTests']
): { severity: ChatSeverity; text: string } => {
  const failedTests = relatedTests.filter((test) => test.result === 'fail');
  const activeAlarms = relatedAlarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus));

  let severity: ChatSeverity = 'info';
  if (route.fiberStatus === 'broken') {
    severity = 'critical';
  } else if (route.fiberStatus === 'degraded' || failedTests.length > 0) {
    severity = 'warning';
  }

  return {
    severity,
    text: formatTechnicianReply([
      {
        title: 'Diagnostic',
        content: `${getSeverityLabel(severity)}. Route ${route.routeName} entre ${route.source} et ${route.destination}. Etat fibre ${route.fiberStatus}.`,
      },
      {
        title: 'Mesures',
        content: `Attenuation ${route.attenuationDb ?? 0} dB. Dernier test ${toIsoOrFallback(route.lastTestTime)}. ${activeAlarms.length} alarmes actives et ${failedTests.length} tests OTDR en echec.`,
      },
      {
        title: 'Causes probables',
        content:
          'Coupure physique, attenuation anormale, epissure degradee ou raccordement instable sur le trajet concerne.',
      },
      {
        title: 'Action immediate',
        content:
          route.fiberStatus === 'broken'
            ? "Priorite haute. Confirmer la coupure avec les dernieres mesures et declencher une intervention terrain."
            : 'Comparer la derniere mesure OTDR a la reference et verifier la zone de perte avant escalation terrain.',
      },
    ]),
  };
};

const loadContext = async (): Promise<ChatContext> => {
  if (!databaseState.connected) {
    return {
      rtus: demoRtus.map((rtu) => ({
        id: rtu.id,
        name: rtu.name,
        locationAddress: rtu.locationAddress,
        status: rtu.status,
        temperature: rtu.temperature,
        lastSeen: rtu.lastSeen,
      })),
      alarms: demoAlarms.map((alarm) => ({
        id: alarm.id,
        rtuId: alarm.rtuId ?? null,
        routeId: alarm.routeId ?? null,
        severity: alarm.severity,
        lifecycleStatus: alarm.lifecycleStatus,
        alarmType: alarm.alarmType,
        message: alarm.message,
        location: alarm.location,
        localizationKm: alarm.localizationKm,
        occurredAt: alarm.occurredAt,
      })),
      routes: demoFiberRoutes.map((route) => ({
        id: route.id,
        routeName: route.routeName,
        source: route.source,
        destination: route.destination,
        fiberStatus: route.fiberStatus,
        attenuationDb: route.attenuationDb,
        lastTestTime: route.lastTestTime,
      })),
      otdrTests: demoOtdrTests.map((test) => ({
        id: test.id,
        routeId: test.routeId ?? null,
        routeName: demoFiberRoutes.find((route) => route.id === test.routeId)?.routeName || 'Unknown',
        result: test.result,
        testedAt: test.testedAt,
        dynamicRangeDb: test.dynamicRangeDb,
      })),
      degradedMode: true,
    };
  }

  const [rtus, alarms, fibres, measurements] = await Promise.all([
    RTU.findAll({ order: [['id', 'ASC']] }),
    Alarm.findAll({ order: [['occurredAt', 'DESC']], limit: 100 }),
    Fibre.findAll({ order: [['id', 'ASC']] }),
    Measurement.findAll({ order: [['timestamp', 'DESC']], limit: 100 }),
  ]);

  const rtuById = new Map<number, RTU>(
    rtus.map((rtu) => [rtu.get('id') as number, rtu])
  );

  const latestMeasurementByFibre = new Map<number, Measurement>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    if (!latestMeasurementByFibre.has(fibreId)) {
      latestMeasurementByFibre.set(fibreId, measurement);
    }
  });

  const routes = fibres.map((fibre) => {
    const fibreId = fibre.get('id') as number;
    const rtuId = fibre.get('rtuId') as number;
    const rtu = rtuById.get(rtuId);
    const fibreName = fibre.get('name') as string;
    const routeName = buildRouteName(
      rtu ? ((rtu.get('name') as string) || `RTU-${rtuId}`) : `RTU-${rtuId}`,
      fibreName
    );
    const latestMeasurement = latestMeasurementByFibre.get(fibreId);

    return {
      id: fibreId,
      routeName,
      source: rtu ? (((rtu.get('locationAddress') as string | null) || (rtu.get('name') as string)) as string) : routeName,
      destination: `Fibre ${fibreName}`,
      fiberStatus: fibre.get('status') as string,
      attenuationDb: latestMeasurement ? ((latestMeasurement.get('attenuation') as number | null) ?? null) : null,
      lastTestTime: latestMeasurement ? ((latestMeasurement.get('timestamp') as Date | null)?.toISOString() || null) : null,
    };
  });

  return {
    rtus: rtus.map((rtu) => ({
      id: rtu.get('id') as number,
      name: rtu.get('name') as string,
      locationAddress: (rtu.get('locationAddress') as string | null) || null,
      status: rtu.get('status') as string,
      temperature: (rtu.get('temperature') as number | null) ?? null,
      lastSeen: ((rtu.get('lastSeen') as Date | null)?.toISOString()) || null,
    })),
    alarms: alarms.map((alarm) => ({
      id: alarm.get('id') as number,
      rtuId: (alarm.get('rtuId') as number | null) ?? null,
      routeId:
        (alarm.get('routeId') as number | null) ??
        ((alarm.get('fibreId') as number | null) ?? null),
      severity: alarm.get('severity') as string,
      lifecycleStatus: alarm.get('lifecycleStatus') as string,
      alarmType: alarm.get('alarmType') as string,
      message: alarm.get('message') as string,
      location: (alarm.get('location') as string | null) || null,
      localizationKm: (alarm.get('localizationKm') as string | null) || null,
      occurredAt: ((alarm.get('occurredAt') as Date | null)?.toISOString()) || null,
    })),
    routes,
    otdrTests: measurements.map((test) => {
      const routeId = (test.get('fibreId') as number | null) ?? null;
      const matchedRoute = routes.find((route) => route.id === routeId);
      const attenuation = (test.get('attenuation') as number | null) ?? null;

      return {
        id: test.get('id') as number,
        routeId,
        routeName: matchedRoute ? matchedRoute.routeName : 'Unknown',
        result: test.get('testResult') as string,
        testedAt: ((test.get('timestamp') as Date | null)?.toISOString()) || null,
        dynamicRangeDb: attenuation !== null ? Number((attenuation + 12).toFixed(1)) : null,
      };
    }),
    degradedMode: false,
  };
};

export const generateAiChatResponse = async (
  message: string,
  username = 'anonymous'
): Promise<AiChatResponsePayload> => {
  const context = await loadContext();
  const trimmedMessage = message.trim();
  const normalizedMessage = normalize(trimmedMessage);

  if (isGreetingMessage(trimmedMessage)) {
    const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length;
    const brokenRoutes = context.routes.filter((route) => route.fiberStatus === 'broken').length;
    const failedOtdrTests = context.otdrTests.filter((test) => test.result === 'fail').length;
    const greetingReply = buildGreetingReply(username);
    const greetingGrounding: GroundingPayload = {
      scope: 'global',
      targetLabel: 'greeting',
      facts: {
        userQuestion: trimmedMessage,
        exactAnswer: greetingReply,
        userDisplayName: formatDisplayName(username),
      },
      allowedEntityNames: [],
    };
    const groqReply = await requireGroqReply({
      message: trimmedMessage,
      context,
      fallbackReply: greetingReply,
      grounding: greetingGrounding,
    });

    return {
      reply: groqReply,
      suggestions: [
        'Explique cette alarme critique.',
        'Donne-moi une checklist pour une RTU injoignable.',
        'Analyse une route avec perte optique.',
      ],
      degradedMode: context.degradedMode,
      provider: 'groq',
      context: {
        counts: {
          rtus: context.rtus.length,
          activeAlarms,
          brokenRoutes,
          failedOtdrTests,
        },
      },
    };
  }

  if (hasAlarmCountIntent(trimmedMessage)) {
    const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length;
    const brokenRoutes = context.routes.filter((route) => route.fiberStatus === 'broken').length;
    const failedOtdrTests = context.otdrTests.filter((test) => test.result === 'fail').length;
    const countReply = buildAlarmCountReply(context, trimmedMessage);
    const countGrounding: GroundingPayload = {
      scope: 'global',
      targetLabel: 'alarm-count',
      facts: {
        userQuestion: trimmedMessage,
        exactAnswer: countReply,
        activeAlarmsBySeverity: {
          critical: context.alarms.filter(
            (alarm) => alarm.severity === 'critical' && isAlarmActive(alarm.lifecycleStatus)
          ).length,
          major: context.alarms.filter(
            (alarm) => alarm.severity === 'major' && isAlarmActive(alarm.lifecycleStatus)
          ).length,
          minor: context.alarms.filter(
            (alarm) => alarm.severity === 'minor' && isAlarmActive(alarm.lifecycleStatus)
          ).length,
          info: context.alarms.filter(
            (alarm) => alarm.severity === 'info' && isAlarmActive(alarm.lifecycleStatus)
          ).length,
        },
      },
      allowedEntityNames: [],
    };

    const groqReply = await requireGroqReply({
      message: trimmedMessage,
      context,
      fallbackReply: countReply,
      grounding: countGrounding,
    });

    return {
      reply: groqReply,
      suggestions: [
        'Combien d alarmes critiques actives ?',
        'Combien d alarmes majeures actives ?',
        'Resume les alarmes les plus prioritaires.',
      ],
      degradedMode: context.degradedMode,
      provider: 'groq',
      context: {
        counts: {
          rtus: context.rtus.length,
          activeAlarms,
          brokenRoutes,
          failedOtdrTests,
        },
      },
    };
  }

  let matchedRoute =
    context.routes.find(
      (route) =>
        includesNormalized(trimmedMessage, route.routeName) ||
        includesNormalized(trimmedMessage, `${route.source} ${route.destination}`) ||
        (hasRouteIntent(trimmedMessage) && includesNormalized(trimmedMessage, String(route.id)))
    ) || null;

  let matchedRtu =
    context.rtus.find(
      (rtu) =>
        includesNormalized(trimmedMessage, rtu.name) ||
        includesNormalized(trimmedMessage, rtu.locationAddress || '') ||
        (hasRtuIntent(trimmedMessage) && includesNormalized(trimmedMessage, String(rtu.id)))
    ) || null;

  let matchedAlarm =
    context.alarms.find(
      (alarm) =>
        includesNormalized(trimmedMessage, alarm.alarmType) ||
        includesNormalized(trimmedMessage, alarm.location || '') ||
        (hasAlarmIntent(trimmedMessage) &&
          (includesNormalized(trimmedMessage, String(alarm.id)) ||
            normalizedMessage.includes(`#${String(alarm.id).toLowerCase()}`)))
    ) || null;

  if (!matchedAlarm && hasAlarmIntent(trimmedMessage)) {
    const requestedSeverity = getAlarmSeverityFilter(trimmedMessage);
    matchedAlarm =
      context.alarms
        .filter((alarm) => isAlarmActive(alarm.lifecycleStatus))
        .filter((alarm) => !requestedSeverity || alarm.severity === requestedSeverity)
        .sort((left, right) => getAlarmPriorityScore(right) - getAlarmPriorityScore(left))[0] || null;
  }

  if (!matchedRtu && hasRtuIntent(trimmedMessage)) {
    matchedRtu =
      context.rtus
        .filter((rtu) => (hasUnavailableRtuIntent(trimmedMessage) ? ['offline', 'unreachable'].includes(rtu.status) : rtu.status !== 'online'))
        .sort((left, right) => getRtuPriorityScore(right) - getRtuPriorityScore(left))[0] || null;
  }

  if (!matchedRoute && hasRouteIntent(trimmedMessage)) {
    matchedRoute =
      context.routes
        .filter((route) => (hasBrokenRouteIntent(trimmedMessage) ? route.fiberStatus === 'broken' : route.fiberStatus !== 'normal'))
        .sort((left, right) => getRoutePriorityScore(right) - getRoutePriorityScore(left))[0] || null;
  }

  const isGeneralConversation =
    !hasProjectIntent(trimmedMessage) && !matchedRoute && !matchedRtu && !matchedAlarm && !hasAlarmCountIntent(trimmedMessage);

  if (isGeneralConversation) {
    const generalReply = await requireGroqReply({
      message: trimmedMessage,
      context,
      fallbackReply: trimmedMessage,
      grounding: {
        scope: 'global',
        targetLabel: 'general-chat',
        facts: {},
        allowedEntityNames: [],
      },
      mode: 'general',
      username,
    });

    return {
      reply: generalReply,
      suggestions: [
        'Explique cette alarme critique.',
        'Donne-moi une checklist pour une RTU injoignable.',
        'Pose-moi une autre question generale.',
      ],
      degradedMode: context.degradedMode,
      provider: 'groq',
      context: {
        counts: {
          rtus: context.rtus.length,
          activeAlarms: context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length,
          brokenRoutes: context.routes.filter((route) => route.fiberStatus === 'broken').length,
          failedOtdrTests: context.otdrTests.filter((test) => test.result === 'fail').length,
        },
      },
    };
  }

  let scope: ChatScope = 'global';
  let targetLabel: string | undefined;
  let reply = buildGlobalReply(context);

  if (matchedAlarm) {
    const relatedRtu = context.rtus.find((rtu) => rtu.id === matchedAlarm.rtuId);
    const relatedRoute = context.routes.find((route) => route.id === matchedAlarm.routeId);
    reply = buildAlarmReply(matchedAlarm, relatedRtu, relatedRoute).text;
    scope = 'alarm';
    targetLabel = `${matchedAlarm.alarmType} #${matchedAlarm.id}`;
  } else if (matchedRtu) {
    const relatedAlarms = context.alarms.filter((alarm) => alarm.rtuId === matchedRtu.id);
    const relatedRouteIds = new Set(
      relatedAlarms.map((alarm) => alarm.routeId).filter((routeId): routeId is number => routeId !== null)
    );
    const relatedTests = context.otdrTests.filter((test) => (test.routeId !== null ? relatedRouteIds.has(test.routeId) : false));
    reply = buildRtuReply(matchedRtu, relatedAlarms, relatedTests).text;
    scope = 'rtu';
    targetLabel = matchedRtu.name;
  } else if (matchedRoute) {
    const relatedAlarms = context.alarms.filter((alarm) => alarm.routeId === matchedRoute.id);
    const relatedTests = context.otdrTests.filter((test) => test.routeId === matchedRoute.id);
    reply = buildRouteReply(matchedRoute, relatedAlarms, relatedTests).text;
    scope = 'route';
    targetLabel = matchedRoute.routeName;
  }

  const grounding = buildGroundingPayload({
    context,
    scope,
    matchedAlarm,
    matchedRoute,
    matchedRtu,
  });

  const groqReply = await requireGroqReply({
    message: trimmedMessage,
    context,
    fallbackReply: reply,
    grounding,
  });

  reply = groqReply;

  const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length;
  const brokenRoutes = context.routes.filter((route) => route.fiberStatus === 'broken').length;
  const failedOtdrTests = context.otdrTests.filter((test) => test.result === 'fail').length;

  return {
    reply,
    suggestions: buildSuggestions(
      matchedRtu?.name,
      matchedAlarm ? `${matchedAlarm.alarmType} #${matchedAlarm.id}` : undefined,
      matchedRoute?.routeName
    ),
    degradedMode: context.degradedMode,
    provider: 'groq',
    context: {
      matchedRtu: matchedRtu?.name,
      matchedAlarm: matchedAlarm ? `${matchedAlarm.alarmType} #${matchedAlarm.id}` : undefined,
      matchedRoute: matchedRoute?.routeName,
      counts: {
        rtus: context.rtus.length,
        activeAlarms,
        brokenRoutes,
        failedOtdrTests,
      },
    },
  };
};
