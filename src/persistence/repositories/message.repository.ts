import { MeshtasticPresetName } from '../../meshtastic-presets';

/**
 * One packet the firmware heard on the air.
 *
 * "Message" here means any Meshtastic packet, not only TEXT_MESSAGE_APP: a
 * telemetry frame and a position beacon are equally things that were said, and
 * cataloguing only the human-readable ones would throw away most of what a
 * monitor actually observes.
 *
 * Identity is `${fromId}:${packetId}`, which is how Meshtastic itself
 * distinguishes packets. A mesh rebroadcasts heavily, so the same packet
 * reaches a listener several times by different routes; those collapse onto one
 * row with a reception count rather than becoming duplicates.
 */
export interface MeshMessage {
  id: string;
  packetId: number;
  fromNum: number;
  fromId: string;
  toNum: number;
  toId: string;
  /** Addressed to everyone rather than to one node. */
  broadcast: boolean;
  /** Modem preset on which the latest copy was received. */
  preset: MeshtasticPresetName | null;

  /** Meshtastic port number, and its enum name when known. */
  portnum: number | null;
  portName: string | null;
  /** On-air channel hash the packet was sent on. */
  channel: number | null;
  /** True when the listener held no key for it, so the payload is unknown. */
  encrypted: boolean;

  /** Decoded text, for TEXT_MESSAGE_APP only. */
  text: string | null;

  /** Telemetry carried by the packet, when it was a telemetry frame. */
  batteryLevel: number | null;
  voltage: number | null;
  channelUtilization: number | null;
  airUtilTx: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;

  /** Reception details, from the most recent copy heard. */
  heardAt: Date;
  heardBy: string | null;
  snr: number | null;
  rssi: number | null;
  hopsAway: number | null;
  viaMqtt: boolean;
  /** How many copies of this packet have been reported. */
  receptions: number;

  firstHeardAt: Date;
  updatedAt: Date;
}

export interface MessageHeardReport
  extends Omit<MeshMessage, 'receptions' | 'firstHeardAt' | 'updatedAt'> {}

export interface RecordMessageResult {
  message: MeshMessage;
  created: boolean;
}

export interface RecentMessagesQuery {
  since?: Date;
  limit: number;
  /** Restrict to packets sent by one node. */
  fromId?: string;
}

export interface MessageRepository {
  count(): Promise<number>;
  findRecent(query: RecentMessagesQuery): Promise<MeshMessage[]>;
  /**
   * Records one reception. A packet already stored has its reception count
   * raised and its signal details refreshed rather than being inserted twice.
   */
  recordHeard(report: MessageHeardReport): Promise<RecordMessageResult>;
}

export const MESSAGE_REPOSITORY = Symbol('MessageRepository');
