/**
 * SafeCross Unit Test Suite
 * Tests mathematical modules: Haversine, Bearing, Projection, Speed, Fix Validation,
 * Closing Speed, CPA, ETA, and the 4-State Classifier Must-Pass Cases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  calculateBearing,
  projectToLocal,
  isPointInForwardCone,
} from '../src/core/geo/calculations.ts';
import { MotionTracker } from '../src/core/motion/motion_engine.ts';
import {
  calculateVehicleRisk,
  evaluateCrossingStatus,
} from '../src/core/risk/risk_engine.ts';
import { DEFAULT_THRESHOLDS } from '../src/core/config/thresholds.ts';

test('1. Haversine Distance: Known Ground Truth', () => {
  // Mumbai Gateway of India (18.9220, 72.8347) to Marine Drive (18.9430, 72.8230) ~ 2.6 km
  const dist = haversineDistance(18.9220, 72.8347, 18.9430, 72.8230);
  assert.ok(dist > 2300 && dist < 2900, `Expected ~2600m, got ${dist}`);

  // Zero distance check
  const zeroDist = haversineDistance(28.6139, 77.2090, 28.6139, 77.2090);
  assert.equal(Math.round(zeroDist), 0);
});

test('2. Bearing Calculation: Cardinal Directions', () => {
  // Directly North: lat increases, lon constant
  const bearingNorth = calculateBearing(10.0, 70.0, 11.0, 70.0);
  assert.ok(Math.abs(bearingNorth - 0) < 0.1 || Math.abs(bearingNorth - 360) < 0.1);

  // Directly East: lat constant, lon increases
  const bearingEast = calculateBearing(0.0, 70.0, 0.0, 71.0);
  assert.ok(Math.abs(bearingEast - 90) < 0.5);
});

test('3. Local Flat-Earth Projection and Forward Cone', () => {
  const originLat = 19.0760;
  const originLon = 72.8777;
  const local = projectToLocal(19.0760, 72.8777, originLat, originLon);
  assert.equal(Math.round(local.x), 0);
  assert.equal(Math.round(local.y), 0);

  // Driver facing North (0 deg), target directly 50m North -> in cone
  const coneCheck = isPointInForwardCone(originLat, originLon, 0, 19.0764, 72.8777, 45);
  assert.equal(coneCheck.inCone, true);

  // Target directly Behind (180 deg) -> out of cone
  const coneBehind = isPointInForwardCone(originLat, originLon, 0, 19.0750, 72.8777, 45);
  assert.equal(coneBehind.inCone, false);
});

test('4. Fix Validation: Noise and Teleportation Rejection', () => {
  const tracker = new MotionTracker(DEFAULT_THRESHOLDS);

  // Accuracy > 50m must be rejected
  const badAccFix = {
    lat: 19.0,
    lng: 72.0,
    accuracy: 65,
    speed: 5,
    heading: 90,
    timestamp: 1000,
  };
  const val1 = tracker.validateFix(badAccFix);
  assert.equal(val1.isValid, false);
  assert.ok(val1.reason?.includes('Accuracy too low'));

  // Valid initial fix
  const validFix1 = {
    lat: 19.0,
    lng: 72.0,
    accuracy: 12,
    speed: 5,
    heading: 90,
    timestamp: 1000,
  };
  assert.equal(tracker.addFix(validFix1), true);

  // Fix with timestamp not strictly newer must be rejected
  const oldTsFix = {
    lat: 19.0001,
    lng: 72.0001,
    accuracy: 10,
    speed: 5,
    heading: 90,
    timestamp: 900,
  };
  assert.equal(tracker.addFix(oldTsFix), false);

  // Teleportation fix (implied speed > 70 m/s) must be rejected
  const teleportFix = {
    lat: 19.05, // ~5.5 km away in 1 second
    lng: 72.05,
    accuracy: 10,
    speed: 10,
    heading: 90,
    timestamp: 2000,
  };
  assert.equal(tracker.addFix(teleportFix), false);
});

test('5. Speed Estimation and Stationary Detection', () => {
  const tracker = new MotionTracker(DEFAULT_THRESHOLDS);
  // High accuracy fix with GPS speed
  tracker.addFix({
    lat: 19.0,
    lng: 72.0,
    accuracy: 8,
    speed: 12.5,
    heading: 45,
    timestamp: 1000,
  });

  const res = tracker.estimateSpeedAndHeading();
  assert.equal(res.speedSource, 'GPS speed');
  assert.equal(Math.round(res.speedMs * 10) / 10, 12.5);
  assert.equal(res.isStationary, false);

  // Stationary fix (< 0.8 m/s)
  tracker.clearHistory();
  tracker.addFix({
    lat: 19.0,
    lng: 72.0,
    accuracy: 5,
    speed: 0.4,
    heading: 45,
    timestamp: 1000,
  });
  const resStat = tracker.estimateSpeedAndHeading();
  assert.equal(resStat.isStationary, true);
  assert.equal(resStat.speedMs, 0);
});

test('6. Closing Speed and ETA Calculation', () => {
  const pedFix = {
    lat: 19.0000,
    lng: 72.0000,
    accuracy: 8,
    speed: 0,
    heading: null,
    timestamp: 10000,
  };

  // Vehicle 100m North (approx 0.0009 degrees), driving South (heading 180 deg) at 10 m/s (36 km/h)
  const distM = 100;
  const latDelta = distM / 6371000 * (180 / Math.PI);
  const vehicleState = {
    sessionId: 'veh-1',
    role: 'driver',
    currentFix: {
      sessionId: 'veh-1',
      role: 'driver',
      lat: 19.0000 + latDelta,
      lng: 72.0000,
      accuracy: 10,
      speed: 10,
      heading: 180,
      serverTs: 10000,
    },
    history: [],
    smoothedSpeed: 10,
    speedSource: 'GPS speed',
    derivedHeading: 180,
    isStale: false,
    isExpired: false,
    dataAgeSeconds: 1,
  };

  const risk = calculateVehicleRisk(pedFix, vehicleState);
  assert.equal(risk.direction, 'Approaching');
  assert.ok(Math.abs(risk.closingSpeedMs - 10) < 0.5);
  assert.ok(risk.etaSeconds !== null && Math.abs(risk.etaSeconds - 10) <= 1);
  assert.equal(risk.hasPathConflict, true);
});

test('7. Four-State Classifier MUST-PASS Cases', () => {
  const pedFix = {
    lat: 19.0000,
    lng: 72.0000,
    accuracy: 10, // Good accuracy
    speed: 0,
    heading: null,
    timestamp: 10000,
  };

  // CASE 1: RED must always be returned for ETA <= 15s with path conflict
  const redVehicle = {
    sessionId: 'v-red',
    role: 'driver',
    currentFix: {
      sessionId: 'v-red',
      role: 'driver',
      lat: 19.0008, // ~88m North
      lng: 72.0000,
      accuracy: 10,
      speed: 10, // 10 m/s -> ETA ~ 9s
      heading: 180, // heading south towards ped
      serverTs: 10000,
    },
    history: [],
    smoothedSpeed: 10,
    speedSource: 'GPS speed',
    derivedHeading: 180,
    isStale: false,
    isExpired: false,
    dataAgeSeconds: 1,
  };

  const statusRed = evaluateCrossingStatus({
    pedestrianFix: pedFix,
    pedestrianFixAgeS: 1,
    vehicles: [redVehicle],
    isServerConnected: true,
    serverConnectedDurationS: 20,
  });
  assert.equal(statusRed.level, 'RED');

  // CASE 2: GREEN is NEVER returned if own data is stale (> 3s)
  const statusStale = evaluateCrossingStatus({
    pedestrianFix: pedFix,
    pedestrianFixAgeS: 4, // stale (> 3s)
    vehicles: [],
    isServerConnected: true,
    serverConnectedDurationS: 20,
  });
  assert.notEqual(statusStale.level, 'GREEN');
  assert.equal(statusStale.level, 'GREY');

  // CASE 3: GREEN is NEVER returned if own accuracy > 20m
  const statusPoorAcc = evaluateCrossingStatus({
    pedestrianFix: { ...pedFix, accuracy: 25 },
    pedestrianFixAgeS: 1,
    vehicles: [],
    isServerConnected: true,
    serverConnectedDurationS: 20,
  });
  assert.notEqual(statusPoorAcc.level, 'GREEN');

  // CASE 4: GREEN is NEVER returned if server not connected >= 10s
  const statusShortConn = evaluateCrossingStatus({
    pedestrianFix: pedFix,
    pedestrianFixAgeS: 1,
    vehicles: [],
    isServerConnected: true,
    serverConnectedDurationS: 5, // < 10s
  });
  assert.notEqual(statusShortConn.level, 'GREEN');

  // CASE 5: GREEN is returned when all strict conditions are satisfied
  const statusGreen = evaluateCrossingStatus({
    pedestrianFix: pedFix,
    pedestrianFixAgeS: 1, // <= 3s
    vehicles: [], // no vehicles in caution ETA
    isServerConnected: true,
    serverConnectedDurationS: 15, // >= 10s
  });
  assert.equal(statusGreen.level, 'GREEN');
  assert.equal(statusGreen.title, 'Clear of SafeCross vehicles');
  assert.ok(statusGreen.description.includes('Untracked vehicles may still be present'));
  // Verification: NEVER contains the word "Safe to cross" or bare "Safe"
  assert.ok(!statusGreen.title.includes('Safe to cross'));
  assert.ok(!statusGreen.description.includes('Safe to cross'));
});
