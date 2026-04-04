import { RTUStatus } from '../types';

export const normalizeRtuStatus = (status?: string | null): RTUStatus => {
  switch ((status || '').toLowerCase()) {
    case RTUStatus.ONLINE:
      return RTUStatus.ONLINE;
    case RTUStatus.OFFLINE:
      return RTUStatus.OFFLINE;
    case RTUStatus.UNREACHABLE:
      return RTUStatus.UNREACHABLE;
    case RTUStatus.WARNING:
      return RTUStatus.UNREACHABLE;
    default:
      return RTUStatus.UNREACHABLE;
  }
};
