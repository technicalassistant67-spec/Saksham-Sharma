/**
 * SafeCross Motion Engine
 * Fix validation, speed estimation with fallback, EMA smoothing, and heading derivation.
 */

import { DEFAULT_THRESHOLDS } from '../config/thresholds';
import { haversineDistance, calculateBearing } from '../geo/calculations';
import { LocationFix, SpeedSource } from '../models/types';

export interface MotionValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface SpeedHeadingResult {
  speedMs: number;
  speedSource: SpeedSource;
  heading: number | null;
  isStationary: boolean;
}

export class MotionTracker {
  private history: LocationFix[] = [];
  private maxHistorySize = 10;
  private currentSmoothedSpeed: number | null = null;
  private lastDerivedHeading: number | null = null;

  private thresholds: typeof DEFAULT_THRESHOLDS;

  constructor(
    thresholds = DEFAULT_THRESHOLDS,
    maxHistorySize: number = 10
  ) {
    this.thresholds = thresholds;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Validates incoming GPS fix against noise, teleportation, and accuracy criteria.
   */
  public validateFix(newFix: LocationFix): MotionValidationResult {
    // 1. Accuracy check: reject if accuracy > MAX_ACCURACY_M (50 m)
    if (newFix.accuracy > this.thresholds.MAX_ACCURACY_M) {
      return {
        isValid: false,
        reason: `Accuracy too low (${newFix.accuracy.toFixed(1)}m > ${this.thresholds.MAX_ACCURACY_M}m)`,
      };
    }

    if (this.history.length === 0) {
      return { isValid: true };
    }

    const lastFix = this.history[this.history.length - 1];

    // 2. Timestamp check: must be strictly newer
    if (newFix.timestamp <= lastFix.timestamp) {
      return {
        isValid: false,
        reason: `Timestamp not strictly newer (${newFix.timestamp} <= ${lastFix.timestamp})`,
      };
    }

    const dtSeconds = (newFix.timestamp - lastFix.timestamp) / 1000;

    // 3. Time gap check: reject if gap dt > MAX_VALID_DT_S (15 s)
    if (dtSeconds > this.thresholds.MAX_VALID_DT_S) {
      return {
        isValid: false,
        reason: `Time gap too large (${dtSeconds.toFixed(1)}s > ${this.thresholds.MAX_VALID_DT_S}s)`,
      };
    }

    // 4. Implied velocity check (anti-teleportation): reject if distance/dt > MAX_VALID_SPEED_MS (70 m/s)
    if (dtSeconds > 0) {
      const distanceM = haversineDistance(
        lastFix.lat,
        lastFix.lng,
        newFix.lat,
        newFix.lng
      );
      const impliedSpeed = distanceM / dtSeconds;

      if (impliedSpeed > this.thresholds.MAX_VALID_SPEED_MS) {
        return {
          isValid: false,
          reason: `Implied speed excessive (${impliedSpeed.toFixed(1)} m/s > ${this.thresholds.MAX_VALID_SPEED_MS} m/s)`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Adds a fix to history if valid.
   */
  public addFix(fix: LocationFix): boolean {
    const val = this.validateFix(fix);
    if (!val.isValid) {
      return false;
    }

    this.history.push(fix);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    return true;
  }

  public getHistory(): LocationFix[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.currentSmoothedSpeed = null;
    this.lastDerivedHeading = null;
  }

  /**
   * Computes speed and heading using tiered rules:
   * 1. Prefer reported GPS speed when accuracy <= GOOD_ACCURACY_M (20 m) and speed >= 0
   * 2. Otherwise calculate distance/dt over last 2-3 fixes (min 2 s apart), labelled "Estimated"
   * 3. Apply EMA smoothing (alpha = 0.4)
   * 4. If speed < STATIONARY_SPEED_MS (0.8 m/s), treat as stationary (0 m/s)
   */
  public estimateSpeedAndHeading(): SpeedHeadingResult {
    if (this.history.length === 0) {
      return {
        speedMs: 0,
        speedSource: 'unavailable',
        heading: null,
        isStationary: true,
      };
    }

    const latest = this.history[this.history.length - 1];
    let rawSpeed: number | null = null;
    let source: SpeedSource = 'unavailable';

    // Tier 1: Reported GPS speed check
    if (
      latest.speed !== null &&
      latest.speed >= 0 &&
      latest.accuracy <= this.thresholds.GOOD_ACCURACY_M
    ) {
      rawSpeed = latest.speed;
      source = 'GPS speed';
    } else {
      // Tier 2: Estimate from recent historical fixes with at least 2s delta
      rawSpeed = this.estimateSpeedFromHistory();
      if (rawSpeed !== null) {
        source = 'Estimated';
      }
    }

    // Apply EMA smoothing
    let speedMs = 0;
    if (rawSpeed !== null) {
      if (this.currentSmoothedSpeed === null) {
        this.currentSmoothedSpeed = rawSpeed;
      } else {
        const alpha = this.thresholds.SPEED_EMA_ALPHA;
        this.currentSmoothedSpeed =
          alpha * rawSpeed + (1 - alpha) * this.currentSmoothedSpeed;
      }
      speedMs = this.currentSmoothedSpeed;
    } else {
      source = 'unavailable';
      speedMs = 0;
    }

    // Stationary check: below 0.8 m/s (~2.88 km/h) is stationary
    const isStationary = speedMs < this.thresholds.STATIONARY_SPEED_MS;
    if (isStationary) {
      speedMs = 0;
    }

    // Heading derivation
    const heading = this.deriveHeading(latest, speedMs);

    return {
      speedMs,
      speedSource: source,
      heading,
      isStationary,
    };
  }

  /**
   * Derives speed from consecutive fixes separated by at least 2 seconds
   */
  private estimateSpeedFromHistory(): number | null {
    if (this.history.length < 2) return null;

    const latest = this.history[this.history.length - 1];
    // Find an earlier fix with delta t >= 2.0s
    for (let i = this.history.length - 2; i >= 0; i--) {
      const prev = this.history[i];
      const dt = (latest.timestamp - prev.timestamp) / 1000;
      if (dt >= 2.0 && dt <= this.thresholds.MAX_VALID_DT_S) {
        const dist = haversineDistance(prev.lat, prev.lng, latest.lat, latest.lng);
        return dist / dt;
      }
    }

    // If we only have 2 fixes < 2s apart, compute if dt > 0.5s as best-effort estimate
    const prev = this.history[this.history.length - 2];
    const dt = (latest.timestamp - prev.timestamp) / 1000;
    if (dt >= 0.5) {
      const dist = haversineDistance(prev.lat, prev.lng, latest.lat, latest.lng);
      return dist / dt;
    }

    return null;
  }

  /**
   * Derives heading:
   * 1. If reported heading is present and speed > MIN_HEADING_SPEED_MS (2.0 m/s), use it.
   * 2. Else derive from bearing between last two fixes if distance > 3m.
   * 3. Else fallback to last known heading or null.
   */
  private deriveHeading(latest: LocationFix, speedMs: number): number | null {
    if (
      latest.heading !== null &&
      latest.heading >= 0 &&
      speedMs >= this.thresholds.MIN_HEADING_SPEED_MS
    ) {
      this.lastDerivedHeading = latest.heading;
      return latest.heading;
    }

    if (this.history.length >= 2) {
      const prev = this.history[this.history.length - 2];
      const dist = haversineDistance(prev.lat, prev.lng, latest.lat, latest.lng);
      if (dist >= 3.0) {
        const bearing = calculateBearing(prev.lat, prev.lng, latest.lat, latest.lng);
        this.lastDerivedHeading = bearing;
        return bearing;
      }
    }

    return this.lastDerivedHeading;
  }
}
