import RTU from '../models/RTU';
import Alarm from '../models/Alarm';
import { emitEvent } from '../utils/websocket';

export class AlarmDetectionService {
  // Vérifier tous les RTU toutes les 10 minutes
  async detectAlarms() {
    const rtus = await RTU.findAll();
    for (const rtu of rtus) {
      // 1. Vérifier si RTU offline
      if (rtu.lastSeen) {
        const lastSeen = new Date(rtu.lastSeen);
        const minutesSinceLastSeen = (Date.now() - lastSeen.getTime()) / 60000;
        if (minutesSinceLastSeen > 15) {
          await this.createAlarm({
            rtuId: rtu.id,
            severity: 'critical',
            alarmType: 'RTU Down',
            message: `RTU ${rtu.name} hors ligne depuis ${Math.round(minutesSinceLastSeen)} minutes`,
          });
        }
      }
      // 2. Vérifier température
      if (rtu.temperature && rtu.temperature > 50) {
        await this.createAlarm({
          rtuId: rtu.id,
          severity: 'critical',
          alarmType: 'Temperature',
          message: `Température critique: ${rtu.temperature}°C`,
        });
      } else if (rtu.temperature && rtu.temperature > 40) {
        await this.createAlarm({
          rtuId: rtu.id,
          severity: 'major',
          alarmType: 'Temperature',
          message: `Température élevée: ${rtu.temperature}°C`,
        });
      }
      // 3. Vérifier atténuation (exemple)
      if (typeof rtu.attenuationDb === 'number' && rtu.attenuationDb > 18) {
        await this.createAlarm({
          rtuId: rtu.id,
          severity: 'critical',
          alarmType: 'High Loss',
          message: `Atténuation critique: ${rtu.attenuationDb} dB`,
        });
      }
    }
  }
  // Créer alarme (si pas déjà existante)
  async createAlarm(alarmData: any) {
    const existing = await Alarm.findOne({
      where: {
        rtuId: alarmData.rtuId,
        alarmType: alarmData.alarmType,
        lifecycleStatus: ['active', 'acknowledged', 'in_progress'],
      },
    });
    if (!existing) {
      const alarm = await Alarm.create({
        ...alarmData,
        lifecycleStatus: 'active',
        occurredAt: new Date(),
      });
      emitEvent('new_alarm', alarm);
      console.log(`🚨 Nouvelle alarme: ${alarm.message}`);
    }
  }
}
