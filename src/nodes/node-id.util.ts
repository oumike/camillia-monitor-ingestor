/** `to` address meaning "everyone" — never a real node. */
export const BROADCAST_NODE_NUM = 0xffffffff;

export const MAX_NODE_NUM = 0xffffffff;

/** Canonical Meshtastic node id: `!` followed by the zero-padded hex node number. */
export function toNodeId(nodeNum: number): string {
  return `!${nodeNum.toString(16).padStart(8, '0')}`;
}

/**
 * Normalises a node id as a device reported it: case-folded, `!`-prefixed.
 * Returns null when it is not eight hex digits.
 */
export function normaliseNodeId(reported: string | undefined): string | null {
  if (!reported) {
    return null;
  }
  const bare = reported.startsWith('!') ? reported.slice(1) : reported;
  if (!/^[0-9a-fA-F]{8}$/.test(bare)) {
    return null;
  }
  return `!${bare.toLowerCase()}`;
}
