/**
 * A Meshtastic MQTT envelope topic is `<root>/2/e/<channel>/<gateway>`.
 *
 * Parsing is anchored on the `/2/e/` marker rather than on a configured root
 * string: the marker is the structural part of the topic and cannot move, while
 * the root varies per deployment and would key everything on the wrong segment
 * the moment it carried a stray slash.
 */
export interface ParsedTopic {
  /** Channel segment, or null when the topic is not an envelope topic. */
  channel: string | null;
  /** Publishing gateway's node id, or null when the topic carries no gateway. */
  gateway: string | null;
}

const ENVELOPE_MARKER = '/2/e/';

export function parseTopic(topic: string): ParsedTopic {
  const marker = topic.indexOf(ENVELOPE_MARKER);
  if (marker < 0) {
    return { channel: null, gateway: null };
  }

  const rest = topic.slice(marker + ENVELOPE_MARKER.length);
  const [channel, gateway] = rest.split('/');

  return {
    channel: channel ? channel : null,
    // A topic may stop at the channel; that is a valid envelope topic with no
    // gateway rather than a malformed one.
    gateway: gateway ? gateway : null,
  };
}
