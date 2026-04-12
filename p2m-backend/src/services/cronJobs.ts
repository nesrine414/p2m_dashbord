import { RtuEmulatorMonitorService } from './rtuEmulatorMonitorService';

const emulatorMonitorService = new RtuEmulatorMonitorService();

export const startAlarmDetection = () => {
  const configuredIntervalSeconds = Number(process.env.RTU_EMULATOR_INTERVAL_SECONDS || 180);
  const intervalSeconds = Number.isFinite(configuredIntervalSeconds)
    ? Math.max(5, Math.floor(configuredIntervalSeconds))
    : 180;
  const intervalMs = intervalSeconds * 1000;
  let cycleRunning = false;

  const runCycle = async () => {
    if (cycleRunning) {
      console.warn('[RTU Emulator] previous cycle still running, skipping this tick.');
      return;
    }

    cycleRunning = true;
    console.log('[RTU Emulator] running automatic monitoring cycle...');
    try {
      await emulatorMonitorService.runCycle();
    } finally {
      cycleRunning = false;
    }
  };

  void runCycle();

  setInterval(() => {
    void runCycle();
  }, intervalMs);

  if (intervalSeconds < 60) {
    console.log(`[RTU Emulator] automatic monitoring started (every ${intervalSeconds} seconds)`);
    return;
  }

  const intervalMinutes = Number((intervalSeconds / 60).toFixed(2));
  console.log(`[RTU Emulator] automatic monitoring started (every ${intervalMinutes} minutes)`);
};
