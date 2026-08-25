/**
 * One MQTT topic this project has seen traffic on.
 *
 * Deliberately not a message log, and not a tally either: the row records that
 * a topic exists and when it was last active. Payloads are never decoded and
 * per-message counting was dropped, so what remains is a census of the topic
 * space itself — which is the question this table answers.
 */
export interface MqttCapture {
  /** Full topic, e.g. `msh/US/MI/2/e/KAM-NET/!699c90c8`. The identity. */
  topic: string;
  /** Channel segment, parsed from the topic. Null when it is not an envelope topic. */
  channel: string | null;

  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface MqttCaptureReport {
  topic: string;
  channel: string | null;
  seenAt: Date;
}

export interface RecordCaptureResult {
  capture: MqttCapture;
  created: boolean;
}

export interface ChannelTopicCount {
  channel: string;
  topics: number;
  /** Most recent activity on the channel, across all its topics. */
  lastSeenAt: Date;
}

export interface MqttCapturesQuery {
  limit: number;
  /** Restrict to one channel. */
  channel?: string;
}

export interface MqttCaptureRepository {
  /** Distinct topics stored. */
  count(): Promise<number>;
  /**
   * Distinct channels stored. Topics that carried no channel — anything not
   * matching the envelope shape — are excluded rather than counted as one
   * anonymous channel.
   */
  countChannels(): Promise<number>;
  /**
   * Each channel with how many distinct topics it holds. This is what a
   * reporting device seeds its on-screen census from, so it can show the whole
   * picture rather than only what it happened to hear since the screen opened.
   */
  channelTopicCounts(): Promise<ChannelTopicCount[]>;
  findRecent(query: MqttCapturesQuery): Promise<MqttCapture[]>;
  /** Records that a topic was seen, creating the row when new. */
  record(report: MqttCaptureReport): Promise<RecordCaptureResult>;
}

export const MQTT_CAPTURE_REPOSITORY = Symbol('MqttCaptureRepository');
