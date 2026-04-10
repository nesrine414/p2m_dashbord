import cron from 'node-cron';

import { RtuEmulatorMonitorService } from './rtuEmulatorMonitorService';

const emulatorMonitorService = new RtuEmulatorMonitorService();

export const startAlarmDetection = () => {
  const runCycle = async () => {
    console.log('[RTU Emulator] running automatic monitoring cycle...');
    await emulatorMonitorService.runCycle();
  };

  void runCycle();

  cron.schedule('*/3 * * * *', async () => {
    await runCycle();
  });

  console.log('[RTU Emulator] automatic monitoring started (every 3 minutes)');
};
