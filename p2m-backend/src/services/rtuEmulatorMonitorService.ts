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
      console.warn('RTU emulator monitor skipped: database not connected.');
      return {
        processedRtus: 0,
        processedFibres: 0,
        issuesDetected: 0,
        sampledAt,
      };
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
