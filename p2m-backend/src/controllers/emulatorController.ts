import { Request, Response } from 'express';
import { lookupTelemetryBundleByIp } from '../services/rtuTelemetryService';
import supervisionEmulatorService from '../services/supervisionEmulatorService';
import { runDiagnosticTest, DiagnosticTestType } from '../services/supervisionDiagnosticService';

export const getEmulatorStatus = (_req: Request, res: Response): void => {
  res.json(supervisionEmulatorService.getStatus());
};

export const startEmulator = (_req: Request, res: Response): void => {
  res.json(supervisionEmulatorService.start());
};

export const stopEmulator = (_req: Request, res: Response): void => {
  res.json(supervisionEmulatorService.stop());
};

export const simulateIncident = async (req: Request, res: Response): Promise<void> => {
  try {
    const ipAddress = String(req.body?.ipAddress || req.query?.ipAddress || '').trim();
    const incidentType = req.body?.incidentType as 'rtu-down' | 'temperature' | 'high-loss' | 'fiber-cut' | undefined;

    if (!ipAddress) {
      res.status(400).json({ error: 'ipAddress is required' });
      return;
    }

    const bundle = await supervisionEmulatorService.triggerIncidentByIp(ipAddress, incidentType, true);
    if (!bundle) {
      res.status(404).json({ error: 'RTU not found for this IP address' });
      return;
    }

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to simulate incident' });
  }
};

export const runDiagnosticTestController = async (req: Request, res: Response): Promise<void> => {
  try {
    const ipAddress = String(req.body?.ipAddress || '').trim();
    const testType = (req.body?.testType || 'full') as DiagnosticTestType;
    const thresholds = req.body?.thresholds ?? undefined;

    if (!ipAddress) {
      res.status(400).json({ error: 'ipAddress is required' });
      return;
    }

    const validTypes: DiagnosticTestType[] = ['otdr', 'temperature', 'full'];
    if (!validTypes.includes(testType)) {
      res.status(400).json({ error: `testType must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const result = await runDiagnosticTest({ ipAddress, testType, thresholds });
    if (!result) {
      res.status(404).json({ error: 'RTU not found for this IP address' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('[DiagnosticTest] Error:', error);
    res.status(500).json({ error: 'Failed to run diagnostic test' });
  }
};

export const getTelemetryBundleByIp = async (req: Request, res: Response): Promise<void> => {
  try {
    const ipAddress = String(req.params.ipAddress || req.query?.ipAddress || '').trim();
    if (!ipAddress) {
      res.status(400).json({ error: 'ipAddress is required' });
      return;
    }

    const bundle = await lookupTelemetryBundleByIp(ipAddress);
    if (!bundle) {
      res.status(404).json({ error: 'RTU not found for this IP address' });
      return;
    }

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry bundle' });
  }
};
