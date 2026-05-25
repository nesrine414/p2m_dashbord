import { RtuEmulatorMonitorService } from './rtuEmulatorMonitorService';

const emulatorMonitorService = new RtuEmulatorMonitorService();
const DEFAULT_EMULATOR_INTERVAL_SECONDS = 30;

const getEmulatorIntervalMs = (): number => {
  const parsed = Number(process.env.RTU_EMULATOR_INTERVAL_SECONDS);
  const seconds = Number.isFinite(parsed) && parsed >= 5 ? parsed : DEFAULT_EMULATOR_INTERVAL_SECONDS;
  return seconds * 1000;
};

export const startAlarmDetection = () => {
  let running = false;

  const runCycle = async () => {
    if (running) {
      console.warn('[RTU Emulator] previous cycle still running; skipping this tick.');
      return;
    }

    running = true;

    try {
      console.log('[RTU Emulator] running automatic monitoring cycle...');
      await emulatorMonitorService.runCycle();
    } catch (error) {
      console.error('[RTU Emulator] monitoring cycle failed:', error);
    } finally {
      running = false;
    }
  };

  void runCycle();

  const intervalMs = getEmulatorIntervalMs();
  setInterval(() => {
    void runCycle();
  }, intervalMs);

  console.log(`[RTU Emulator] automatic monitoring started (every ${intervalMs / 1000} seconds)`);
};
