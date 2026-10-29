/**
 * SafeCross Tunable Thresholds Configuration
 * All numeric thresholds are centralized here for easy tuning and inspection.
 */

export interface ThresholdsConfig {
  /** Time after which a fix is marked stale (greyed out with label) */
  STALE_AFTER_S: number;
  /** Time after which an inactive participant is removed completely */
  EXPIRE_AFTER_S: number;
  /** Server relevance filter: clients only receive peers within this radius */
  RELEVANCE_RADIUS_M: number;
  /** OSM Overpass crossing search radius */
  CROSSING_RADIUS_M: number;
  /** Overpass crossing cache validity in seconds */
  CROSSING_CACHE_TTL_S: number;
  /** Minimum movement (meters) before requesting fresh crossings */
  CROSSING_MIN_MOVE_M: number;
  /** Danger ETA threshold for RED state */
  DANGER_ETA_S: number;
  /** Danger distance threshold for RED state (regardless of ETA) */
  DANGER_DIST_M: number;
  /** Caution ETA threshold for AMBER state */
  CAUTION_ETA_S: number;
  /** Maximum acceptable GPS horizontal accuracy for valid calculation */
  MAX_ACCURACY_M: number;
  /** High accuracy threshold required for GREEN state and raw GPS speed trust */
  GOOD_ACCURACY_M: number;
  /** Speeds below this are considered stationary */
  STATIONARY_SPEED_MS: number;
  /** Minimum speed required to trust GPS heading directly */
  MIN_HEADING_SPEED_MS: number;
  /** Minimum closing speed to consider a vehicle approaching */
  MIN_CLOSING_SPEED_MS: number;
  /** Lateral miss distance threshold for path conflict */
  CONFLICT_CORRIDOR_M: number;
  /** Driver forward alert distance */
  DRIVER_ALERT_DIST_M: number;
  /** Driver forward vision half-cone angle in degrees */
  DRIVER_CONE_DEG: number;
  /** Alert sound/vibration cooldown between identical risk levels */
  ALERT_COOLDOWN_S: number;
  /** Maximum ETA displayed before showing '> 2 min' */
  MAX_DISPLAY_ETA_S: number;
  /** Maximum realistic speed (reject GPS teleportation) */
  MAX_VALID_SPEED_MS: number;
  /** Maximum valid time gap between consecutive GPS fixes */
  MAX_VALID_DT_S: number;
  /** Exponential moving average alpha for speed smoothing */
  SPEED_EMA_ALPHA: number;
  /** Driver settings lock speed */
  DRIVER_LOCK_SPEED_KMH: number;
}

export const DEFAULT_THRESHOLDS: ThresholdsConfig = {
  STALE_AFTER_S: 10,
  EXPIRE_AFTER_S: 60,
  RELEVANCE_RADIUS_M: 500,
  CROSSING_RADIUS_M: 300,
  CROSSING_CACHE_TTL_S: 60,
  CROSSING_MIN_MOVE_M: 150,
  DANGER_ETA_S: 15,
  DANGER_DIST_M: 40,
  CAUTION_ETA_S: 30,
  MAX_ACCURACY_M: 50,
  GOOD_ACCURACY_M: 20,
  STATIONARY_SPEED_MS: 0.8,
  MIN_HEADING_SPEED_MS: 2.0,
  MIN_CLOSING_SPEED_MS: 0.5,
  CONFLICT_CORRIDOR_M: 8.0,
  DRIVER_ALERT_DIST_M: 50.0,
  DRIVER_CONE_DEG: 45.0,
  ALERT_COOLDOWN_S: 8.0,
  MAX_DISPLAY_ETA_S: 120,
  MAX_VALID_SPEED_MS: 70.0, // 252 km/h
  MAX_VALID_DT_S: 15.0,
  SPEED_EMA_ALPHA: 0.4,
  DRIVER_LOCK_SPEED_KMH: 5.0,
};

// Earth radius in meters (WGS-84 mean radius)
export const EARTH_RADIUS_M = 6371000;
