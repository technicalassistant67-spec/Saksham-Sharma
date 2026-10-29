/**
 * SafeCross Simulation Scenarios
 * 10 realistic, fully mathematically-grounded test scenarios for college demo evaluation.
 */

import { LocationFix, ParticipantSnapshot } from '../core/models/types';

export interface SimFrame {
  pedestrianFix: LocationFix | null;
  vehicles: ParticipantSnapshot[];
  networkConnected: boolean;
  gpsPermission: 'granted' | 'denied';
  description: string;
}

export interface ScenarioDefinition {
  id: number;
  title: string;
  summary: string;
  durationSeconds: number;
  generateFrame: (tSeconds: number) => SimFrame;
}

// Reference anchor: College Campus Gate (Mumbai road layout context)
const BASE_LAT = 19.0760;
const BASE_LNG = 72.8777;
const M_TO_LAT = 1 / 111111; // ~1 degree lat = 111,111 meters
const M_TO_LNG = 1 / (111111 * Math.cos((BASE_LAT * Math.PI) / 180));

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 1,
    title: '1. Stationary Pedestrian + Approaching Vehicle (Constant Speed)',
    summary: 'Vehicle approaches straight from 120m North at 10 m/s (36 km/h). Shows clear countdown from ~12s down to danger.',
    durationSeconds: 15,
    generateFrame: (t) => {
      const initialDist = 120;
      const speed = 10; // 10 m/s
      const currentDist = Math.max(5, initialDist - speed * t);
      const vehicleLat = BASE_LAT + currentDist * M_TO_LAT;

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 6,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-1',
            role: 'driver',
            lat: vehicleLat,
            lng: BASE_LNG,
            accuracy: 8,
            speed,
            heading: 180, // heading South directly towards pedestrian
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Vehicle at ${Math.round(currentDist)}m approaching at 36 km/h. ETA ~${Math.max(1, Math.round(currentDist / speed))}s.`,
      };
    },
  },
  {
    id: 2,
    title: '2. Moving Pedestrian + Moving Vehicle',
    summary: 'Pedestrian steps forward at 1.2 m/s while vehicle approaches at 12 m/s (43 km/h).',
    durationSeconds: 12,
    generateFrame: (t) => {
      const pedSpeed = 1.2;
      const vehSpeed = 12;
      const pedLat = BASE_LAT + (pedSpeed * t) * M_TO_LAT;
      const vehDist = Math.max(8, 140 - vehSpeed * t);
      const vehLat = BASE_LAT + vehDist * M_TO_LAT;

      return {
        pedestrianFix: {
          lat: pedLat,
          lng: BASE_LNG,
          accuracy: 7,
          speed: pedSpeed,
          heading: 0,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-2',
            role: 'driver',
            lat: vehLat,
            lng: BASE_LNG,
            accuracy: 9,
            speed: vehSpeed,
            heading: 180,
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Pedestrian walking North at 1.2 m/s. Vehicle approaching South at 43 km/h.`,
      };
    },
  },
  {
    id: 3,
    title: '3. Vehicle Moving Away (Receding)',
    summary: 'Vehicle has already passed and is driving away North at 11 m/s. Direction shows Moving Away.',
    durationSeconds: 10,
    generateFrame: (t) => {
      const dist = 30 + 11 * t;
      const vehLat = BASE_LAT + dist * M_TO_LAT;

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 5,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-3',
            role: 'driver',
            lat: vehLat,
            lng: BASE_LNG,
            accuracy: 8,
            speed: 11,
            heading: 0, // heading North away from pedestrian
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Vehicle moving away at ${Math.round(dist)}m. No collision risk.`,
      };
    },
  },
  {
    id: 4,
    title: '4. Vehicle Accelerating and Braking',
    summary: 'Vehicle initially accelerates towards crossing then brakes heavily from 50 km/h to 10 km/h.',
    durationSeconds: 14,
    generateFrame: (t) => {
      // Speed curve: fast then deceleration
      let speed = t < 5 ? 14 : Math.max(2.5, 14 - (t - 5) * 1.8);
      let dist = Math.max(10, 150 - (t < 5 ? 14 * t : 70 + (t - 5) * 6));

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 6,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-4',
            role: 'driver',
            lat: BASE_LAT + dist * M_TO_LAT,
            lng: BASE_LNG,
            accuracy: 8,
            speed,
            heading: 180,
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Vehicle braking: speed changed to ${(speed * 3.6).toFixed(1)} km/h. Dynamic ETA updates.`,
      };
    },
  },
  {
    id: 5,
    title: '5. Stale Updates (Signal Dropout)',
    summary: 'Vehicle telemetry stops updating after t = 3s. After 10s fix becomes greyed with Stale badge.',
    durationSeconds: 15,
    generateFrame: (t) => {
      const freezeTime = Math.min(3, t);
      const dist = 90 - 8 * freezeTime;
      const ageMs = (t - freezeTime) * 1000;

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 6,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-5',
            role: 'driver',
            lat: BASE_LAT + dist * M_TO_LAT,
            lng: BASE_LNG,
            accuracy: 8,
            speed: 8,
            heading: 180,
            serverTs: Date.now() - ageMs,
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Vehicle fix is ${(ageMs / 1000).toFixed(1)}s old. Marked Stale if > 10s.`,
      };
    },
  },
  {
    id: 6,
    title: '6. Permission Denied Recovery',
    summary: 'Simulates Android GPS permission denial banner and recovery flow.',
    durationSeconds: 10,
    generateFrame: (t) => {
      const isDenied = t < 5;
      return {
        pedestrianFix: isDenied
          ? null
          : {
              lat: BASE_LAT,
              lng: BASE_LNG,
              accuracy: 8,
              speed: 0,
              heading: null,
              timestamp: Date.now(),
            },
        vehicles: [],
        networkConnected: true,
        gpsPermission: isDenied ? 'denied' : 'granted',
        description: isDenied
          ? 'GPS permission denied. SafeCross shows prominent warning and open settings button.'
          : 'Permission granted! GPS acquiring fixes.',
      };
    },
  },
  {
    id: 7,
    title: '7. Network / Server Disconnected',
    summary: 'Simulates relay server link drop. SafeCross immediately enters GREY Insufficient Data state.',
    durationSeconds: 10,
    generateFrame: (t) => {
      const isOnline = t < 3;
      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 6,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: isOnline
          ? [
              {
                sessionId: 'sim-veh-7',
                role: 'driver',
                lat: BASE_LAT + 80 * M_TO_LAT,
                lng: BASE_LNG,
                accuracy: 7,
                speed: 9,
                heading: 180,
                serverTs: Date.now(),
              },
            ]
          : [],
        networkConnected: isOnline,
        gpsPermission: 'granted',
        description: isOnline
          ? 'Relay connected.'
          : 'WebSocket disconnected! Immediate fallback to GREY Insufficient Data.',
      };
    },
  },
  {
    id: 8,
    title: '8. Missing or Inaccurate Movement Data',
    summary: 'Vehicle sends degraded accuracy (45m) and null heading. AMBER Caution state triggered.',
    durationSeconds: 10,
    generateFrame: () => {
      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 12,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-8',
            role: 'driver',
            lat: BASE_LAT + 70 * M_TO_LAT,
            lng: BASE_LNG + 15 * M_TO_LNG,
            accuracy: 45, // degraded accuracy
            speed: null, // missing raw GPS speed
            heading: null, // missing heading
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: 'Poor vehicle GPS accuracy (45m) & unknown heading. AMBER Caution displayed.',
      };
    },
  },
  {
    id: 9,
    title: '9. Conflict Clearing as Vehicle Turns Away',
    summary: 'Vehicle approaches then turns sharply East at intersection; miss distance expands past 8m corridor.',
    durationSeconds: 14,
    generateFrame: (t) => {
      const isTurning = t >= 5;
      let vehLat = BASE_LAT + Math.max(25, 110 - 10 * t) * M_TO_LAT;
      let vehLng = BASE_LNG + (isTurning ? (t - 5) * 10 : 0) * M_TO_LNG;
      let heading = isTurning ? 90 : 180; // 90 is East

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 5,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-9',
            role: 'driver',
            lat: vehLat,
            lng: vehLng,
            accuracy: 6,
            speed: 10,
            heading,
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: isTurning
          ? 'Vehicle turned East away from pedestrian! Conflict corridor cleared.'
          : 'Vehicle heading towards pedestrian in conflict corridor.',
      };
    },
  },
  {
    id: 10,
    title: '10. Two Vehicles Approaching (Sorted by Soonest ETA)',
    summary: 'Two vehicles approaching from North and West. Primary card highlights the most urgent ETA.',
    durationSeconds: 15,
    generateFrame: (t) => {
      // Vehicle 1: 80m North at 10 m/s -> ETA ~8s
      const dist1 = Math.max(10, 80 - 8 * t);
      // Vehicle 2: 200m West at 12 m/s -> ETA ~16s
      const dist2 = Math.max(15, 200 - 10 * t);

      return {
        pedestrianFix: {
          lat: BASE_LAT,
          lng: BASE_LNG,
          accuracy: 6,
          speed: 0,
          heading: null,
          timestamp: Date.now(),
        },
        vehicles: [
          {
            sessionId: 'sim-veh-10A',
            role: 'driver',
            lat: BASE_LAT + dist1 * M_TO_LAT,
            lng: BASE_LNG,
            accuracy: 8,
            speed: 8,
            heading: 180,
            serverTs: Date.now(),
          },
          {
            sessionId: 'sim-veh-10B',
            role: 'driver',
            lat: BASE_LAT,
            lng: BASE_LNG - dist2 * M_TO_LNG,
            accuracy: 9,
            speed: 10,
            heading: 90, // heading East towards ped
            serverTs: Date.now(),
          },
        ],
        networkConnected: true,
        gpsPermission: 'granted',
        description: `Two vehicles approaching. Priority given to Vehicle 1 (closer ETA).`,
      };
    },
  },
];
