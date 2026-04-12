import { useEffect, useState } from 'react';
import getSocket from '../utils/socket';
import {
  SupervisionDashboardSnapshot,
  SupervisionSocketEventName,
  SupervisionTelemetryBundle,
} from '../types/liveSupervision';

export interface LiveSocketEventSnapshot {
  name: SupervisionSocketEventName;
  payload: unknown;
  receivedAt: string;
}

export interface UseLiveSupervisionResult {
  socketReady: boolean;
  connected: boolean;
  revision: number;
  lastEvent: LiveSocketEventSnapshot | null;
  lastTelemetryBundle: SupervisionTelemetryBundle | null;
  lastKpiSnapshot: SupervisionDashboardSnapshot | null;
}

const LIVE_EVENTS: SupervisionSocketEventName[] = [
  'new_alarm',
  'alarm_updated',
  'rtu_updated',
  'fibre_updated',
  'incident_started',
  'incident_resolved',
  'kpi_updated',
  'telemetry_bundle',
];

export const useLiveSupervision = (): UseLiveSupervisionResult => {
  const [socketReady, setSocketReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);
  const [lastEvent, setLastEvent] = useState<LiveSocketEventSnapshot | null>(null);
  const [lastTelemetryBundle, setLastTelemetryBundle] = useState<SupervisionTelemetryBundle | null>(null);
  const [lastKpiSnapshot, setLastKpiSnapshot] = useState<SupervisionDashboardSnapshot | null>(null);

  useEffect(() => {
    const socket = getSocket();
    setSocketReady(true);
    setConnected(socket.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handlers = LIVE_EVENTS.map((eventName) => {
      const handler = (payload: unknown) => {
        setRevision((value) => value + 1);
        setLastEvent({
          name: eventName,
          payload,
          receivedAt: new Date().toISOString(),
        });

        if (eventName === 'telemetry_bundle') {
          setLastTelemetryBundle(payload as SupervisionTelemetryBundle);
        }

        if (eventName === 'kpi_updated') {
          setLastKpiSnapshot(payload as SupervisionDashboardSnapshot);
        }
      };

      socket.on(eventName, handler);
      return { eventName, handler };
    });

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      handlers.forEach(({ eventName, handler }) => {
        socket.off(eventName, handler);
      });
    };
  }, []);

  return {
    socketReady,
    connected,
    revision,
    lastEvent,
    lastTelemetryBundle,
    lastKpiSnapshot,
  };
};

export default useLiveSupervision;
