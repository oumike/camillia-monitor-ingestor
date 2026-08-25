export interface StorageHealth {
  /** Driver backing the repositories, e.g. `sqlite` or `mongodb`. */
  driver: string;
  connected: boolean;
  /** Populated when `connected` is false. */
  error?: string;
}

/**
 * Every persistence implementation exposes the same liveness probe so callers
 * (like the status endpoint) never need to know which store is wired up.
 */
export interface StorageHealthIndicator {
  check(): Promise<StorageHealth>;
}

export const STORAGE_HEALTH_INDICATOR = Symbol('StorageHealthIndicator');
