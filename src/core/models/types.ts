/**
 * SafeCross Core Models & Enums
 */

export type UserRole = 'pedestrian' | 'driver';

export type SpeedSource = 'GPS speed' | 'Estimated' | 'unavailable';

export type DirectionStatus = 'Approaching' | 'Moving away' | 'Not approaching' | 'Stationary';

export type RiskLevel = 'RED' | 'AMBER' | 'GREY' | 'GREEN';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  speed: number | null; // in m/s
  heading: number | null; // 0..360 degrees
  timestamp: number; // local client epoch ms
  altitude?: number | null;
}

export interface ParticipantSnapshot {
  sessionId: string;
  role: UserRole;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  serverTs: number;
}

export interface ParticipantState {
  sessionId: string;
  role: UserRole;
  currentFix: ParticipantSnapshot;
  history: ParticipantSnapshot[];
  smoothedSpeed: number | null;
  speedSource: SpeedSource;
  derivedHeading: number | null;
  isStale: boolean;
  isExpired: boolean;
  dataAgeSeconds: number;
}

export interface VehicleRiskInfo {
  sessionId: string;
  distanceMeters: number;
  closingSpeedMs: number;
  direction: DirectionStatus;
  etaSeconds: number | null;
  uncertaintySeconds: number | null;
  speedMs: number;
  speedKmh: number;
  speedSource: SpeedSource;
  heading: number | null;
  dataAgeSeconds: number;
  missDistanceMeters: number | null;
  hasPathConflict: boolean;
  isUrgent: boolean;
  statusText: string;
}

export interface CrossingStatusAssessment {
  level: RiskLevel;
  title: string;
  description: string;
  primaryVehicle: VehicleRiskInfo | null;
  allVehicles: VehicleRiskInfo[];
  evaluatedAt: number;
  disclaimer: string;
  canCrossEvaluated: boolean;
}

export interface MappedCrossing {
  id: string | number;
  lat: number;
  lng: number;
  type: string;
  source: 'OpenStreetMap';
  distanceMeters?: number;
}

export interface DriverPedestrianAlert {
  pedestrianId: string;
  distanceMeters: number;
  angleDegrees: number;
  isInForwardCone: boolean;
  isUrgent: boolean;
  message: string;
}

export interface SystemDiagnostics {
  gpsActive: boolean;
  gpsPermission: 'prompt' | 'granted' | 'denied';
  gpsAccuracyMeters: number | null;
  lastFixAgeSeconds: number | null;
  socketConnected: boolean;
  socketConnecting: boolean;
  socketUrl: string;
  roomCode: string;
  sessionId: string;
  roundTripLatencyMs: number | null;
  serverClockOffsetMs: number;
  activeParticipantsCount: number;
  dataQualitySummary: 'Excellent' | 'Good' | 'Degraded' | 'Offline';
}
