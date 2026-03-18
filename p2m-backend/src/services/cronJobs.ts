import cron from 'node-cron';

import { AlarmDetectionService } from './alarmDetectionService';
const alarmService = new AlarmDetectionService();

export const startAlarmDetection = () => {
  cron.schedule('*/10 * * * *', async () => {
    console.log('🔍 Vérification alarmes...');
    await alarmService.detectAlarms();
  });
  console.log('✅ Cron job alarmes démarré (toutes les 10 min)');
};
