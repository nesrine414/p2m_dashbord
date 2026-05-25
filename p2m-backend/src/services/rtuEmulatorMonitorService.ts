import { databaseState } from '../config/database';
import { Fibre, Measurement, RTU } from '../models';
import { emitEvent } from '../utils/websocket';
import { AlarmDetectionService } from './alarmDetectionService';
import { emitDashboardKpiUpdate } from './dashboardStatsService';
import { runRtuEmulatorQuery } from './rtuEmulatorService';

const DEFAULT_WAVELENGTH = 1550;

export interface EmulatorCycleSummary {
  processedRtus: number;
  processedFibres: number;
  issuesDetected: number;
  sampledAt: string;
}

export class RtuEmulatorMonitorService {
  private readonly alarmService = new AlarmDetectionService();

  async runCycle(): Promise<EmulatorCycleSummary> {
    const sampledAt = new Date().toISOString();
    const sampledAtDate = new Date(sampledAt);

    if (!databaseState.connected) {
      console.warn('RTU emulator monitor skipped: database not connected. Emulating fake alarm for demo UI.');
      
      const { demoAlarms, demoRtus } = require('../data/demoData');
      const randomRtu = demoRtus[Math.floor(Math.random() * demoRtus.length)];
      
      const newAlarm = {
        id: Math.max(...demoAlarms.map((a: any) => a.id), 0) + 1,
        rtuId: randomRtu.id,
        fibreId: null,
        routeId: null,
        severity: Math.random() > 0.5 ? 'major' : 'minor',
        lifecycleStatus: 'active',
        alarmType: 'Temperature',
        message: `Température anormale détectée sur ${randomRtu.name} (Simulation)`,
        location: randomRtu.locationAddress,
        localizationKm: null,
        owner: 'Demo Engine',
        occurredAt: sampledAt,
      };
      
      demoAlarms.unshift(newAlarm);
      if (demoAlarms.length > 50) demoAlarms.pop();
      
      emitEvent('new_alarm', newAlarm);

      const summary: EmulatorCycleSummary = {
        processedRtus: demoRtus.length,
        processedFibres: 0,
        issuesDetected: demoAlarms.filter((a: any) => a.lifecycleStatus === 'active').length,
        sampledAt,
      };

      emitEvent('emulator_cycle_completed', summary);
      return summary;
    }

    const rtus = (await RTU.findAll({
      order: [['id', 'ASC']],
    })).filter((rtu) => String(rtu.get('ipAddress') || '').trim().length > 0);

    let processedRtus = 0;
    let processedFibres = 0;
    let issuesDetected = 0;
    let nextMeasurementId = (((await Measurement.max('id')) as number | null) ?? 0) + 1;

    for (const rtu of rtus) {
      const ipAddress = String(rtu.get('ipAddress') || '').trim();
      if (!ipAddress) {
        continue;
      }

      const result = await runRtuEmulatorQuery(ipAddress);
      if (!result) {
        continue;
      }

      processedRtus += 1;
      const heartbeatDate = new Date(Date.now() - result.rtu.metrics.heartbeatAgeMinutes * 60_000);

      await rtu.update({
        status: result.rtu.status,
        power: result.rtu.metrics.power,
        temperature: result.rtu.metrics.temperatureC ?? undefined,
        otdrStatus: result.rtu.metrics.otdrStatus ?? undefined,
        attenuationDb: result.rtu.metrics.averageAttenuationDb ?? undefined,
        lastSeen: heartbeatDate,
      });

      for (const fibreResult of result.fibres) {
        const fibre = await Fibre.findByPk(fibreResult.id);
        if (!fibre) {
          continue;
        }

        processedFibres += 1;

        if (fibreResult.status !== 'normal' || fibreResult.metrics.testResult === 'fail') {
          issuesDetected += 1;
        }

        await fibre.update({
          status: fibreResult.status,
        });

        await Measurement.create({
          id: nextMeasurementId,
          fibreId: fibreResult.id,
          attenuation: fibreResult.metrics.attenuationDb ?? undefined,
          testResult:
            fibreResult.metrics.testResult ?? (fibreResult.status === 'normal' ? 'pass' : 'fail'),
          wavelength: fibreResult.metrics.wavelength ?? DEFAULT_WAVELENGTH,
          timestamp: sampledAtDate,
        });
        nextMeasurementId += 1;
      }
    }

    await this.alarmService.detectAlarms();

    const summary: EmulatorCycleSummary = {
      processedRtus,
      processedFibres,
      issuesDetected,
      sampledAt,
    };

    emitEvent('emulator_cycle_completed', summary);
    await emitDashboardKpiUpdate();
    console.log(
      `[RTU Emulator] cycle complete at ${sampledAt}: ${processedRtus} RTU, ${processedFibres} fibres, ${issuesDetected} issue(s).`
    );

    return summary;
  }
}
