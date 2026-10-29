/**
 * SafeCross Geodetic & Flat-Earth Calculations
 * Fully explainable and mathematically validated algorithms.
 */

import { EARTH_RADIUS_M } from '../config/thresholds';

/**
 * Degrees to radians conversion
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Radians to degrees conversion
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 1. Haversine distance between two coordinates in meters.
 * R = 6,371,000 m
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = degToRad(lat1);
  const phi2 = degToRad(lat2);
  const deltaPhi = degToRad(lat2 - lat1);
  const deltaLambda = degToRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * 2. Great-circle initial bearing from point 1 to point 2 in degrees (0..360, where 0 is North).
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = degToRad(lat1);
  const phi2 = degToRad(lat2);
  const deltaLambda = degToRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (radToDeg(theta) + 360) % 360;

  return bearing;
}

/**
 * 3. Local Flat-Earth ENU (East-North-Up) Projection in meters.
 * Converts geodetic lat/lon to planar (x = East, y = North) coordinates
 * relative to an origin reference point (e.g., pedestrian position).
 * Suitable for local collision calculations within < 5 km.
 */
export interface LocalPoint {
  x: number; // East in meters
  y: number; // North in meters
}

export function projectToLocal(
  lat: number,
  lon: number,
  originLat: number,
  originLon: number
): LocalPoint {
  const deltaLat = degToRad(lat - originLat);
  const deltaLon = degToRad(lon - originLon);
  const meanLat = degToRad(originLat);

  // y is North (meridional distance)
  const y = deltaLat * EARTH_RADIUS_M;
  // x is East (parallel distance scaled by cos of latitude)
  const x = deltaLon * EARTH_RADIUS_M * Math.cos(meanLat);

  return { x, y };
}

/**
 * Converts a heading angle (0° = North, 90° = East, clockwise) and speed (m/s)
 * into a Cartesian 2D velocity vector (vx = East, vy = North).
 */
export interface VelocityVector {
  vx: number; // m/s East
  vy: number; // m/s North
}

export function headingSpeedToVelocity(headingDeg: number, speedMs: number): VelocityVector {
  const headingRad = degToRad(headingDeg);
  // Heading 0 is North (vy = speed, vx = 0)
  // Heading 90 is East (vy = 0, vx = speed)
  const vx = speedMs * Math.sin(headingRad);
  const vy = speedMs * Math.cos(headingRad);
  return { vx, vy };
}

/**
 * Computes angular difference between two angles in degrees (-180 to +180).
 */
export function angleDifferenceDeg(angle1: number, angle2: number): number {
  let diff = (angle2 - angle1 + 180) % 360 - 180;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Checks whether a target point lies within a forward vision cone
 * from an observer at (obsLat, obsLon) with a given heading and half-cone angle.
 */
export function isPointInForwardCone(
  obsLat: number,
  obsLon: number,
  obsHeadingDeg: number | null,
  targetLat: number,
  targetLon: number,
  halfConeAngleDeg: number = 45
): { inCone: boolean; bearingDeg: number; angleOffsetDeg: number; distanceM: number } {
  const dist = haversineDistance(obsLat, obsLon, targetLat, targetLon);
  const bearing = calculateBearing(obsLat, obsLon, targetLat, targetLon);

  if (obsHeadingDeg === null || isNaN(obsHeadingDeg)) {
    // If heading is completely unknown, we assume omnidirectional caution within range
    return {
      inCone: true,
      bearingDeg: bearing,
      angleOffsetDeg: 0,
      distanceM: dist,
    };
  }

  const offset = Math.abs(angleDifferenceDeg(obsHeadingDeg, bearing));
  const inCone = offset <= halfConeAngleDeg;

  return {
    inCone,
    bearingDeg: bearing,
    angleOffsetDeg: offset,
    distanceM: dist,
  };
}
