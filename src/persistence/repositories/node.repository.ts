/**
 * Storage-agnostic view of a Meshtastic node as the service cares about it:
 * identity plus the most recent time we heard from it. Deliberately free of any
 * ORM/ODM decorators so both the SQLite and the future MongoDB implementation
 * can map onto it.
 */
export interface MeshNode {
  /** Meshtastic node number — unique per mesh, not globally. */
  nodeNum: number;
  /** Canonical `!abcdef12` node id. The key an upsert matches on. */
  nodeId: string;
  longName: string | null;
  shortName: string | null;
  /** Model name, or 'Unknown' when only the raw enum value is known. */
  hwModel: string | null;
  /** Raw HardwareModel enum value, retained so a name can be resolved later. */
  hwModelNum: number | null;
  role: string | null;

  /** When the node was last heard, per the reporting device. */
  lastHeardAt: Date | null;
  /** Node id of the gateway/firmware that reported hearing it. */
  lastHeardBy: string | null;
  /** Signal metrics from that reception. */
  snr: number | null;
  rssi: number | null;
  hopsAway: number | null;
  /** Heard over MQTT rather than over the air, so RF metrics are not the mesh's. */
  viaMqtt: boolean;

  /** Position in 1e-7 degrees, as Meshtastic sends it. */
  latitudeI: number | null;
  longitudeI: number | null;
  altitude: number | null;
  /** How much the sender blurred the fix; low values mean coarse. */
  precisionBits: number | null;

  batteryLevel: number | null;
  voltage: number | null;

  firstHeardAt: Date;
  updatedAt: Date;
}

/**
 * One "I heard this node" report. Everything but `nodeNum` is optional: a bare
 * reception carries no names, and a NodeInfo packet carries no position.
 */
export interface NodeHeardReport {
  nodeNum: number;
  nodeId: string;
  longName?: string | null;
  shortName?: string | null;
  hwModel?: string | null;
  hwModelNum?: number | null;
  role?: string | null;
  lastHeardAt: Date;
  lastHeardBy?: string | null;
  snr?: number | null;
  rssi?: number | null;
  hopsAway?: number | null;
  viaMqtt?: boolean;
  latitudeI?: number | null;
  longitudeI?: number | null;
  altitude?: number | null;
  precisionBits?: number | null;
  batteryLevel?: number | null;
  voltage?: number | null;
}

/**
 * Outcome of a heard report. `created` is what lets a reporting device keep a
 * running total without re-querying: it can only tell that a node is new to
 * *itself*, not that it was new to the store.
 */
export interface RecordHeardResult {
  node: MeshNode;
  created: boolean;
}

export interface HeardNodesQuery {
  /** Only nodes heard at or after this instant. */
  since?: Date;
  limit: number;
}

export interface NodeRepository {
  count(): Promise<number>;
  findLastHeardAt(): Promise<Date | null>;
  /** Most recently heard first. */
  findRecentlyHeard(query: HeardNodesQuery): Promise<MeshNode[]>;
  /**
   * Merges a report into the stored node, creating it if new. Fields absent
   * from the report keep whatever was previously known.
   */
  recordHeard(report: NodeHeardReport): Promise<RecordHeardResult>;
}

export const NODE_REPOSITORY = Symbol('NodeRepository');
