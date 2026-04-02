import Alarm from './Alarm';
import AuditLog from './AuditLog';
import DashboardSnapshot from './DashboardSnapshot';
import Fibre from './Fibre';
import FiberRoute from './FiberRoute';
import HealthScore from './HealthScore';
import Measurement from './Measurement';
import OtdrTestResult from './OtdrTestResult';
import Performance from './Performance';
import Prediction from './Prediction';
import ReportJob from './ReportJob';
import RTU from './RTU';
import User from './User';

User.hasMany(RTU, { foreignKey: 'userId', as: 'rtus' });
RTU.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

RTU.hasMany(Alarm, { foreignKey: 'rtuId', as: 'alarms' });
Alarm.belongsTo(RTU, { foreignKey: 'rtuId', as: 'rtu' });

RTU.hasMany(Fibre, { foreignKey: 'rtuId', as: 'fibres' });
Fibre.belongsTo(RTU, { foreignKey: 'rtuId', as: 'rtu' });

Fibre.hasMany(Alarm, { foreignKey: 'fibreId', as: 'fibreAlarms' });
Alarm.belongsTo(Fibre, { foreignKey: 'fibreId', as: 'fibre' });

FiberRoute.hasMany(Alarm, { foreignKey: 'routeId', as: 'alarms' });
Alarm.belongsTo(FiberRoute, { foreignKey: 'routeId', as: 'route' });

Fibre.hasMany(Measurement, { foreignKey: 'fibreId', as: 'measurements' });
Measurement.belongsTo(Fibre, { foreignKey: 'fibreId', as: 'fibre' });

Fibre.hasMany(Performance, { foreignKey: 'fibreId', as: 'performances' });
Performance.belongsTo(Fibre, { foreignKey: 'fibreId', as: 'fibre' });

RTU.hasMany(OtdrTestResult, { foreignKey: 'rtuId', as: 'otdrTests' });
OtdrTestResult.belongsTo(RTU, { foreignKey: 'rtuId', as: 'rtu' });

FiberRoute.hasMany(OtdrTestResult, { foreignKey: 'routeId', as: 'otdrTests' });
OtdrTestResult.belongsTo(FiberRoute, { foreignKey: 'routeId', as: 'route' });

RTU.hasMany(Prediction, { foreignKey: 'rtuId', as: 'predictions' });
Prediction.belongsTo(RTU, { foreignKey: 'rtuId', as: 'rtu' });

RTU.hasMany(HealthScore, { foreignKey: 'rtuId', as: 'healthScores' });
HealthScore.belongsTo(RTU, { foreignKey: 'rtuId', as: 'rtu' });

User.hasMany(ReportJob, { foreignKey: 'requestedBy', as: 'reportJobs' });
ReportJob.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

export {
  User,
  RTU,
  Fibre,
  FiberRoute,
  Alarm,
  Measurement,
  OtdrTestResult,
  Performance,
  Prediction,
  HealthScore,
  DashboardSnapshot,
  ReportJob,
  AuditLog,
};
