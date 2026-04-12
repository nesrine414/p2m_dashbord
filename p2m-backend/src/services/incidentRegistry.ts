import { SupervisionIncidentRecord } from '../types/supervision';

class IncidentRegistry {
  private readonly incidents = new Map<string, SupervisionIncidentRecord>();

  register(record: SupervisionIncidentRecord): boolean {
    if (this.incidents.has(record.key)) {
      return false;
    }

    this.incidents.set(record.key, record);
    return true;
  }

  upsert(record: SupervisionIncidentRecord): SupervisionIncidentRecord {
    this.incidents.set(record.key, record);
    return record;
  }

  get(key: string): SupervisionIncidentRecord | undefined {
    return this.incidents.get(key);
  }

  findByRtuId(rtuId: number): SupervisionIncidentRecord | undefined {
    for (const incident of this.incidents.values()) {
      if (incident.rtuId === rtuId) {
        return incident;
      }
    }

    return undefined;
  }

  list(): SupervisionIncidentRecord[] {
    return Array.from(this.incidents.values()).sort(
      (left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime()
    );
  }

  remove(key: string): boolean {
    return this.incidents.delete(key);
  }

  clear(): void {
    this.incidents.clear();
  }

  count(): number {
    return this.incidents.size;
  }
}

export const incidentRegistry = new IncidentRegistry();

export default incidentRegistry;
