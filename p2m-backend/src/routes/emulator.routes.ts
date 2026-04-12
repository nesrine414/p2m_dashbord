import { Router } from 'express';
import {
  getEmulatorStatus,
  getTelemetryBundleByIp,
  runDiagnosticTestController,
  simulateIncident,
  startEmulator,
  stopEmulator,
} from '../controllers/emulatorController';

const router = Router();

router.get('/status', getEmulatorStatus);
router.post('/start', startEmulator);
router.post('/stop', stopEmulator);
router.post('/simulate', simulateIncident);
router.post('/run-test', runDiagnosticTestController);
router.get('/bundle/:ipAddress', getTelemetryBundleByIp);
router.get('/lookup/:ipAddress', getTelemetryBundleByIp);

export default router;
