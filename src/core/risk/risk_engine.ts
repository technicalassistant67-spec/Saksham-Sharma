/**
 * SafeCross Risk Assessment Engine
 * Rigorous physics and geometry for closing speed, CPA, conflict corridor, and the 4-state classifier.
 */

import { DEFAULT_THRESHOLDS, ThresholdsConfig } from '../config/thresholds';
import {
  haversineDistance,
  projectToLocal,
  headingSpeedToVelocity,
} from '../geo/calculations';
import {
  CrossingStatusAssessment,
  DirectionStatus,
  LocationFix,
  ParticipantState,
  RiskLevel,
  VehicleRiskInfo,
} from '../models/types';

export interface AssessPedestrianRiskParams {
  pedestrianFix: LocationFix | null;
  pedestrianFixAgeS: number;
  vehicles: ParticipantState[];
  isServerConnected: boolean;
  serverConnectedDurationS: number;
  thresholds?: ThresholdsConfig;
}

/**
 * Computes closing speed and ETA for a vehicle relative to a pedestrian.
 */
export function calculateVehicleRisk(
  pedestrianFix: LocationFix,
  vehicleState: ParticipantState,
  thresholds: ThresholdsConfig = DEFAULT_THRESHOLDS
): VehicleRiskInfo {
  const vFix = vehicleState.currentFix;
  const distHaversine = haversineDistance(
    pedestrianFix.lat,
    pedestrianFix.lng,
    vFix.lat,
    vFix.lng
  );

  const speedMs = vehicleState.smoothedSpeed ?? vFix.speed ?? 0;
  const speedKmh = speedMs * 3.6;
  const heading = vehicleState.derivedHeading ?? vFix.heading;
  const dataAge = vehicleState.dataAgeSeconds;

  // Project vehicle into local flat-earth coordinates with pedestrian at origin (0, 0)
  const localPos = projectToLocal(
    vFix.lat,
    vFix.lng,
    pedestrianFix.lat,
    pedestrianFix.lng
  );
  // localPos.x = vehicle East of pedestrian, localPos.y = vehicle North of pedestrian
  const distLocal = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
  const distanceMeters = distHaversine; // use Haversine for display

  // If vehicle is stationary or speed is missing
  if (speedMs < thresholds.STATIONARY_SPEED_MS || heading === null) {
    return {
      sessionId: vehicleState.sessionId,
      distanceMeters,
      closingSpeedMs: 0,
      direction: speedMs < thresholds.STATIONARY_SPEED_MS ? 'Stationary' : 'Not approaching',
      etaSeconds: null,
      uncertaintySeconds: null,
      speedMs,
      speedKmh,
      speedSource: vehicleState.speedSource,
      heading,
      dataAgeSeconds: dataAge,
      missDistanceMeters: null,
      hasPathConflict: false,
      isUrgent: distanceMeters <= thresholds.DANGER_DIST_M,
      statusText: speedMs < thresholds.STATIONARY_SPEED_MS ? 'Stationary' : 'Heading unknown',
    };
  }

  // Velocity vector of vehicle in East/North (m/s)
  const vel = headingSpeedToVelocity(heading, speedMs);

  // Vector from vehicle to pedestrian is (-localPos.x, -localPos.y)
  // Closing speed is the dot product of vehicle velocity with unit vector towards pedestrian
  // closingSpeed = (vel.vx * (-localPos.x) + vel.vy * (-localPos.y)) / distLocal
  let closingSpeedMs = 0;
  if (distLocal > 0.001) {
    closingSpeedMs = (-localPos.x * vel.vx + -localPos.y * vel.vy) / distLocal;
  }

  // Direction classification
  let direction: DirectionStatus = 'Not approaching';
  if (closingSpeedMs > thresholds.MIN_CLOSING_SPEED_MS) {
    direction = 'Approaching';
  } else if (closingSpeedMs < -thresholds.MIN_CLOSING_SPEED_MS) {
    direction = 'Moving away';
  } else {
    direction = 'Not approaching';
  }

  // Closest Point of Approach (CPA) calculation
  // Assuming pedestrian is near stationary or calculating relative CPA:
  // r(t) = r0 + v * t
  // t_cpa = - (r0 . v) / |v|^2 = (localPos.x * vel.vx + localPos.y * vel.vy) / (speedMs^2) ...
  // Since r0 is (localPos.x, localPos.y) and v is (vel.vx, vel.vy):
  const vSquared = vel.vx * vel.vx + vel.vy * vel.vy;
  let timeToCpaSeconds = 0;
  let missDistanceMeters: number | null = null;
  let hasPathConflict = false;

  if (vSquared > 0.01) {
    timeToCpaSeconds = -(localPos.x * vel.vx + localPos.y * vel.vy) / vSquared;
    if (timeToCpaSeconds > 0) {
      const cpaX = localPos.x + vel.vx * timeToCpaSeconds;
      const cpaY = localPos.y + vel.vy * timeToCpaSeconds;
      missDistanceMeters = Math.sqrt(cpaX * cpaX + cpaY * cpaY);
      hasPathConflict = missDistanceMeters <= thresholds.CONFLICT_CORRIDOR_M;
    } else {
      // Vehicle CPA was in the past
      missDistanceMeters = distLocal;
      hasPathConflict = false;
    }
  }

  // If vehicle is very close (within danger dist), conflict is flagged regardless of heading jitter
  if (distanceMeters <= thresholds.DANGER_DIST_M) {
    hasPathConflict = true;
  }

  // ETA Calculation
  let etaSeconds: number | null = null;
  let uncertaintySeconds: number | null = null;
  let statusText = '';

  if (direction === 'Approaching' && closingSpeedMs > thresholds.MIN_CLOSING_SPEED_MS) {
    const rawEta = distanceMeters / closingSpeedMs;
    etaSeconds = Math.max(0, Math.round(rawEta));

    // Uncertainty estimation based on combined GPS inaccuracy
    // sigma_eta approx (accuracy_ped + accuracy_veh) / closingSpeed
    const combinedAccuracy = (pedestrianFix.accuracy || 10) + (vFix.accuracy || 10);
    const rawUncertainty = Math.round(combinedAccuracy / closingSpeedMs);
    uncertaintySeconds = Math.max(1, Math.min(rawUncertainty, 15));

    if (etaSeconds > thresholds.MAX_DISPLAY_ETA_S) {
      statusText = '> 2 min';
    } else {
      statusText = `~${etaSeconds} s (±${uncertaintySeconds} s)`;
    }
  } else if (direction === 'Moving away') {
    statusText = 'Moving away';
  } else {
    statusText = 'Not approaching';
  }

  const isUrgent =
    (etaSeconds !== null && etaSeconds <= thresholds.DANGER_ETA_S) ||
    distanceMeters <= thresholds.DANGER_DIST_M;

  return {
    sessionId: vehicleState.sessionId,
    distanceMeters,
    closingSpeedMs,
    direction,
    etaSeconds,
    uncertaintySeconds,
    speedMs,
    speedKmh,
    speedSource: vehicleState.speedSource,
    heading,
    dataAgeSeconds: dataAge,
    missDistanceMeters,
    hasPathConflict,
    isUrgent,
    statusText,
  };
}

/**
 * 4-State Priority-Based Classifier:
 * RED > AMBER > GREY > GREEN
 */
export function evaluateCrossingStatus(
  params: AssessPedestrianRiskParams
): CrossingStatusAssessment {
  const {
    pedestrianFix,
    pedestrianFixAgeS,
    vehicles,
    isServerConnected,
    serverConnectedDurationS,
    thresholds = DEFAULT_THRESHOLDS,
  } = params;

  const disclaimer =
    'SafeCross only detects phones running this app. Other vehicles, bikes and people are NOT shown. Always look, listen and follow traffic signals.';

  // If own fix is missing
  if (!pedestrianFix) {
    return {
      level: 'GREY',
      title: 'Insufficient Data',
      description: 'Awaiting current GPS location fix...',
      primaryVehicle: null,
      allVehicles: [],
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: false,
    };
  }

  // Assess all active vehicles
  const vehicleRisks = vehicles
    .filter((v) => !v.isExpired)
    .map((v) => calculateVehicleRisk(pedestrianFix, v, thresholds));

  // Sort vehicles: soonest approaching ETA first, then by closest distance
  vehicleRisks.sort((a, b) => {
    if (a.etaSeconds !== null && b.etaSeconds !== null) {
      return a.etaSeconds - b.etaSeconds;
    }
    if (a.etaSeconds !== null) return -1;
    if (b.etaSeconds !== null) return 1;
    return a.distanceMeters - b.distanceMeters;
  });

  const primaryVehicle = vehicleRisks.length > 0 ? vehicleRisks[0] : null;

  // 1. CHECK RED ("Elevated Risk")
  // A tracked vehicle is approaching, paths may intersect,
  // ETA <= DANGER_ETA_S (15 s) OR distance <= DANGER_DIST_M (40 m).
  const redVehicle = vehicleRisks.find(
    (v) =>
      (v.direction === 'Approaching' &&
        v.etaSeconds !== null &&
        v.etaSeconds <= thresholds.DANGER_ETA_S &&
        (v.hasPathConflict || v.distanceMeters <= thresholds.DANGER_DIST_M)) ||
      (v.distanceMeters <= thresholds.DANGER_DIST_M && v.direction !== 'Moving away')
  );

  if (redVehicle) {
    const etaText = redVehicle.etaSeconds !== null ? `in ~${redVehicle.etaSeconds}s` : 'very close';
    return {
      level: 'RED',
      title: 'Elevated Risk',
      description: `Tracked vehicle approaching (${Math.round(redVehicle.distanceMeters)}m, ${etaText}). Do not step onto road!`,
      primaryVehicle: redVehicle,
      allVehicles: vehicleRisks,
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: true,
    };
  }

  // 2. CHECK AMBER ("Caution")
  // A vehicle is approaching with DANGER_ETA_S < ETA <= CAUTION_ETA_S (30 s);
  // OR data is usable but uncertain (accuracy between 20 and 50 m, heading unknown, only inferred speed).
  const amberApproaching = vehicleRisks.find(
    (v) =>
      v.direction === 'Approaching' &&
      v.etaSeconds !== null &&
      v.etaSeconds > thresholds.DANGER_ETA_S &&
      v.etaSeconds <= thresholds.CAUTION_ETA_S
  );

  const hasUncertainVehicle = vehicleRisks.some(
    (v) =>
      v.distanceMeters <= thresholds.RELEVANCE_RADIUS_M &&
      (v.speedSource === 'Estimated' ||
        v.heading === null ||
        v.dataAgeSeconds > 5 ||
        (pedestrianFix.accuracy > thresholds.GOOD_ACCURACY_M &&
          pedestrianFix.accuracy <= thresholds.MAX_ACCURACY_M))
  );

  if (amberApproaching) {
    return {
      level: 'AMBER',
      title: 'Caution',
      description: `Approaching vehicle in ~${amberApproaching.etaSeconds}s (${Math.round(amberApproaching.distanceMeters)}m). Monitor road awareness.`,
      primaryVehicle: amberApproaching,
      allVehicles: vehicleRisks,
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: true,
    };
  }

  // 3. CHECK GREY ("Insufficient Data")
  // Own fix older than 5 s OR accuracy worse than 50 m,
  // no network or server connection,
  // no valid vehicle data, or any calculation input missing.
  const ownFixStale = pedestrianFixAgeS > 5;
  const ownAccuracyPoor = pedestrianFix.accuracy > thresholds.MAX_ACCURACY_M;
  const serverNotReady = !isServerConnected;

  if (ownFixStale || ownAccuracyPoor || serverNotReady) {
    let reason = 'Insufficient data';
    if (!isServerConnected) reason = 'Relay server disconnected';
    else if (ownAccuracyPoor)
      reason = `GPS accuracy degraded (${Math.round(pedestrianFix.accuracy)}m > 50m)`;
    else if (ownFixStale) reason = `GPS fix stale (${pedestrianFixAgeS.toFixed(1)}s old)`;

    return {
      level: 'GREY',
      title: 'Insufficient Data',
      description: `${reason}. Visual checking mandatory.`,
      primaryVehicle,
      allVehicles: vehicleRisks,
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: false,
    };
  }

  // If there are vehicles nearby with high uncertainty or unknown movement
  if (hasUncertainVehicle && vehicleRisks.length > 0) {
    return {
      level: 'AMBER',
      title: 'Caution — Data Uncertain',
      description: 'Nearby vehicle detected with estimated speed or uncertain heading. Stay attentive.',
      primaryVehicle: primaryVehicle || vehicleRisks[0],
      allVehicles: vehicleRisks,
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: true,
    };
  }

  // 4. CHECK GREEN ("Clear of SafeCross vehicles")
  // Shown ONLY when ALL of the following are strictly true:
  // a) Own accuracy <= GOOD_ACCURACY_M (20 m)
  // b) Own fix <= 3 s old
  // c) Server connected for at least 10 s
  // d) No tracked vehicle within CAUTION_ETA_S (30 s) or within DANGER_DIST_M (40 m)
  // e) No tracked vehicle with unknown movement inside RELEVANCE_RADIUS_M (500 m)
  const isAccurate = pedestrianFix.accuracy <= thresholds.GOOD_ACCURACY_M;
  const isFresh = pedestrianFixAgeS <= 3;
  const isConnectionStable = isServerConnected && serverConnectedDurationS >= 10;

  const noVehicleInCautionEta = !vehicleRisks.some(
    (v) =>
      v.direction === 'Approaching' &&
      v.etaSeconds !== null &&
      v.etaSeconds <= thresholds.CAUTION_ETA_S
  );

  const noVehicleInDangerDist = !vehicleRisks.some(
    (v) => v.distanceMeters <= thresholds.DANGER_DIST_M
  );

  const noVehicleWithUnknownMovementNearby = !vehicleRisks.some(
    (v) =>
      v.distanceMeters <= thresholds.RELEVANCE_RADIUS_M &&
      (v.direction === 'Not approaching' && v.heading === null && v.speedMs > thresholds.STATIONARY_SPEED_MS)
  );

  if (
    isAccurate &&
    isFresh &&
    isConnectionStable &&
    noVehicleInCautionEta &&
    noVehicleInDangerDist &&
    noVehicleWithUnknownMovementNearby
  ) {
    return {
      level: 'GREEN',
      title: 'Clear of SafeCross vehicles',
      description:
        'Untracked vehicles may still be present. Look both ways before crossing.',
      primaryVehicle: null,
      allVehicles: vehicleRisks,
      evaluatedAt: Date.now(),
      disclaimer,
      canCrossEvaluated: true,
    };
  }

  // Fallback to GREY if any strict criteria not fully satisfied
  return {
    level: 'GREY',
    title: 'Insufficient Data',
    description: 'Stabilizing GPS and peer telemetry signals...',
    primaryVehicle,
    allVehicles: vehicleRisks,
    evaluatedAt: Date.now(),
    disclaimer,
    canCrossEvaluated: false,
  };
}
