import { Alarm, FiberRoute, OtdrTestResult, RTU } from '../models';
import { databaseState } from '../config/database';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';

type ChatSeverity = 'info' | 'warning' | 'critical';
type ChatScope = 'global' | 'alarm' | 'rtu' | 'route';

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

const ACTIVE_ALARM_STATUSES = new Set(['active', 'acknowledged']);
const normalize = (value: string): string => value.toLowerCase().trim();
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 60000);
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

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

const generateGroqReply = async (params: {
  message: string;
  context: ChatContext;
  fallbackReply: string;
  scope: ChatScope;
  targetLabel?: string;
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
          {
            role: 'system',
            content: [
              'You are NQMS, a telecom fiber supervision assistant for field technicians.',
              'Answer in clear operational French.',
              'Prefer short and useful wording over generic explanations.',
              'If you use a technical term, explain it briefly in simple language.',
              'Use this structure whenever possible:',
              'Diagnostic',
              'Causes probables',
              'Verifications terrain',
              'Action immediate',
              'Keep the answer under 10 lines unless the user asks for more detail.',
              'Do not invent project facts. Use the provided context only.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Question: ${params.message}`,
              `Scope: ${params.scope}`,
              `Target: ${params.targetLabel || 'global'}`,
              '',
              'Project context:',
              buildContextDigest(params.context),
              '',
              'Base operational analysis:',
              params.fallbackReply,
              '',
              'Return a practical answer for a technician in the field.',
            ].join('\n'),
          },
        ],
        temperature: 0.2,
        max_tokens: 350,
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
    return content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const buildGlobalReply = (context: ChatContext): string => {
  const activeAlarms = context.alarms.filter((alarm) => isAlarmActive(alarm.lifecycleStatus)).length;
  const criticalAlarms = context.alarms.filter(
    (alarm) => alarm.severity === 'critical' && isAlarmActive(alarm.lifecycleStatus)
  ).length;
  const brokenRoutes = context.routes.filter((route) => route.fiberStatus === 'broken').length;
  const failedTests = context.otdrTests.filter((test) => test.result === 'fail').length;
  const offlineRtus = context.rtus.filter((rtu) => rtu.status === 'offline' || rtu.status === 'unreachable').length;

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
        content: `${getSeverityLabel(severity)}. RTU ${rtu.name} en statut ${rtu.status}. Temperature ${rtu.temperature ?? 0} C. Dernier contact ${rtu.lastSeen || 'inconnu'}.`,
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
        content: `Attenuation ${route.attenuationDb ?? 0} dB. Dernier test ${route.lastTestTime || 'inconnu'}. ${activeAlarms.length} alarmes actives et ${failedTests.length} tests OTDR en echec.`,
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

  const [rtus, alarms, routes, otdrTests] = await Promise.all([
    RTU.findAll({ order: [['id', 'ASC']] }),
    Alarm.findAll({ order: [['occurredAt', 'DESC']], limit: 100 }),
    FiberRoute.findAll({ order: [['id', 'ASC']] }),
    OtdrTestResult.findAll({ order: [['testedAt', 'DESC']], limit: 50 }),
  ]);

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
      routeId: (alarm.get('routeId') as number | null) ?? null,
      severity: alarm.get('severity') as string,
      lifecycleStatus: alarm.get('lifecycleStatus') as string,
      alarmType: alarm.get('alarmType') as string,
      message: alarm.get('message') as string,
      location: (alarm.get('location') as string | null) || null,
      localizationKm: (alarm.get('localizationKm') as string | null) || null,
      occurredAt: ((alarm.get('occurredAt') as Date | null)?.toISOString()) || null,
    })),
    routes: routes.map((route) => ({
      id: route.get('id') as number,
      routeName: route.get('routeName') as string,
      source: route.get('source') as string,
      destination: route.get('destination') as string,
      fiberStatus: route.get('fiberStatus') as string,
      attenuationDb: (route.get('attenuationDb') as number | null) ?? null,
      lastTestTime: ((route.get('lastTestTime') as Date | null)?.toISOString()) || null,
    })),
    otdrTests: otdrTests.map((test) => {
      const routeId = (test.get('routeId') as number | null) ?? null;
      const matchedRoute = routes.find((route) => (route.get('id') as number) === routeId);

      return {
        id: test.get('id') as number,
        routeId,
        routeName: matchedRoute ? (matchedRoute.get('routeName') as string) : 'Unknown',
        result: test.get('result') as string,
        testedAt: ((test.get('testedAt') as Date | null)?.toISOString()) || null,
        dynamicRangeDb: (test.get('dynamicRangeDb') as number | null) ?? null,
      };
    }),
    degradedMode: false,
  };
};

export const generateAiChatResponse = async (message: string): Promise<AiChatResponsePayload> => {
  const context = await loadContext();
  const trimmedMessage = message.trim();
  const normalizedMessage = normalize(trimmedMessage);

  const matchedRoute =
    context.routes.find(
      (route) =>
        includesNormalized(trimmedMessage, route.routeName) ||
        includesNormalized(trimmedMessage, `${route.source} ${route.destination}`) ||
        (hasRouteIntent(trimmedMessage) && includesNormalized(trimmedMessage, String(route.id)))
    ) || null;

  const matchedRtu =
    context.rtus.find(
      (rtu) =>
        includesNormalized(trimmedMessage, rtu.name) ||
        includesNormalized(trimmedMessage, rtu.locationAddress || '') ||
        (hasRtuIntent(trimmedMessage) && includesNormalized(trimmedMessage, String(rtu.id)))
    ) || null;

  const matchedAlarm =
    context.alarms.find(
      (alarm) =>
        includesNormalized(trimmedMessage, alarm.alarmType) ||
        includesNormalized(trimmedMessage, alarm.location || '') ||
        (hasAlarmIntent(trimmedMessage) &&
          (includesNormalized(trimmedMessage, String(alarm.id)) ||
            normalizedMessage.includes(`#${String(alarm.id).toLowerCase()}`)))
    ) || null;

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

  const groqReply = await generateGroqReply({
    message: trimmedMessage,
    context,
    fallbackReply: reply,
    scope,
    targetLabel,
  });

  let provider: 'groq' | 'fallback' = 'fallback';
  if (groqReply) {
    reply = groqReply;
    provider = 'groq';
  }

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
    provider,
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
