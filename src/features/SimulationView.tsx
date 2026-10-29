/**
 * SafeCross Simulation Lab (Section 11)
 * Enhanced Dual Dashboard for Both Pedestrian and Driver:
 * - Real-time Collision Time (ETA)
 * - Distance (meters)
 * - Vehicle & Pedestrian Speeds (km/h & m/s)
 * - Multi-Factor Collision Risk (RED / AMBER / GREY / GREEN, CPA corridor, Forward Cone, Stopping Distance)
 * - Interactive Dynamic Overrides (Brake / Accelerate / Scenario Select)
 */

import React, { useState, useEffect, useRef } from 'react';
import { SCENARIOS, ScenarioDefinition } from '../simulation/scenarios';
import { MapView } from '../components/MapView';
import { ArrivalCard } from '../components/ArrivalCard';
import { RiskStatusBanner } from '../components/RiskStatusBanner';
import { evaluateCrossingStatus } from '../core/risk/risk_engine';
import { ParticipantState } from '../core/models/types';
import {
  haversineDistance,
  isPointInForwardCone,
  calculateBearing,
} from '../core/geo/calculations';
import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';

interface SimulationViewProps {
  onBackToHome: () => void;
}

type ViewPerspective = 'dual' | 'pedestrian' | 'driver';

export const SimulationView: React.FC<SimulationViewProps> = ({ onBackToHome }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(1);
  const [simTime, setSimTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [perspective, setPerspective] = useState<ViewPerspective>('dual');

  // Interactive manual speed delta override (+/- km/h applied to vehicle)
  const [speedOverrideKmh, setSpeedOverrideKmh] = useState<number>(0);

  const scenario: ScenarioDefinition =
    SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback timer (runs at 5 fps)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 200;
    timerRef.current = setInterval(() => {
      setSimTime((prev) => {
        const next = prev + (intervalMs / 1000) * playbackSpeed;
        if (next >= scenario.durationSeconds) {
          return 0; // loop
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, scenario.durationSeconds]);

  // Reset time on scenario change
  const handleSelectScenario = (id: number) => {
    setSelectedScenarioId(id);
    setSimTime(0);
    setSpeedOverrideKmh(0);
    setIsPlaying(true);
  };

  // Generate current simulation frame
  const currentFrame = scenario.generateFrame(simTime);

  // Apply speed override to simulated vehicles if active
  const vehiclesWithOverride = currentFrame.vehicles.map((v) => {
    if (speedOverrideKmh !== 0 && v.speed !== null) {
      const adjustedSpeedMs = Math.max(0, v.speed + speedOverrideKmh / 3.6);
      return {
        ...v,
        speed: adjustedSpeedMs,
      };
    }
    return v;
  });

  // Convert simulated vehicles to ParticipantState
  const simulatedPeers: ParticipantState[] = vehiclesWithOverride.map((v) => ({
    sessionId: v.sessionId,
    role: v.role,
    currentFix: v,
    history: [v],
    smoothedSpeed: v.speed,
    speedSource: v.speed !== null ? 'GPS speed' : 'unavailable',
    derivedHeading: v.heading,
    isStale: Date.now() - v.serverTs > 10000,
    isExpired: Date.now() - v.serverTs > 60000,
    dataAgeSeconds: (Date.now() - v.serverTs) / 1000,
  }));

  // Pedestrian assessment
  const pedFix = currentFrame.pedestrianFix;
  const assessment = evaluateCrossingStatus({
    pedestrianFix: pedFix,
    pedestrianFixAgeS: pedFix ? 1.0 : 99,
    vehicles: simulatedPeers,
    isServerConnected: currentFrame.networkConnected,
    serverConnectedDurationS: currentFrame.networkConnected ? 25 : 0,
  });

  const primaryVeh = assessment.primaryVehicle;
  const primaryVehRaw = vehiclesWithOverride[0] || null;

  // Driver metrics calculations
  let driverDistanceM = 0;
  let driverForwardCone = { inCone: false, bearingDeg: 0, angleOffsetDeg: 0, distanceM: 0 };
  let driverClosingSpeedMs = 0;
  let driverCollisionEtaS: number | null = null;
  let driverStoppingDistM = 0;
  let driverSpeedKmh = 0;
  let pedSpeedKmh = 0;

  if (pedFix && primaryVehRaw) {
    driverDistanceM = haversineDistance(
      primaryVehRaw.lat,
      primaryVehRaw.lng,
      pedFix.lat,
      pedFix.lng
    );

    driverForwardCone = isPointInForwardCone(
      primaryVehRaw.lat,
      primaryVehRaw.lng,
      primaryVehRaw.heading,
      pedFix.lat,
      pedFix.lng,
      DEFAULT_THRESHOLDS.DRIVER_CONE_DEG
    );

    driverSpeedKmh = (primaryVehRaw.speed || 0) * 3.6;
    pedSpeedKmh = (pedFix.speed || 0) * 3.6;
    driverClosingSpeedMs = primaryVeh?.closingSpeedMs || 0;
    driverCollisionEtaS = primaryVeh?.etaSeconds || null;

    // Kinematic stopping distance estimation: d_stop = v * t_react + v^2 / (2 * mu * g)
    // t_react = 1.0s, mu = 0.7 (dry asphalt), g = 9.81
    const v = primaryVehRaw.speed || 0;
    driverStoppingDistM = v * 1.0 + (v * v) / (2 * 0.7 * 9.81);
  }

  const driverCanStop = driverDistanceM > driverStoppingDistM;
  const isDriverAlertUrgent =
    driverForwardCone.inCone &&
    (driverDistanceM <= DEFAULT_THRESHOLDS.DRIVER_ALERT_DIST_M ||
      (driverCollisionEtaS !== null && driverCollisionEtaS <= DEFAULT_THRESHOLDS.DANGER_ETA_S));

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Prominent DEMO ONLY Banner */}
      <div className="bg-amber-500 text-black px-4 py-1.5 text-xs font-black tracking-wider uppercase flex items-center justify-between z-30 shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="text-base">⚠️</span> DEMO ONLY — NOT LIVE DATA • COLLISION SIMULATION LAB
        </span>
        <button
          onClick={onBackToHome}
          className="bg-black text-white px-2.5 py-0.5 rounded text-[11px] font-bold hover:bg-slate-900 transition-colors"
        >
          Exit Sim
        </button>
      </div>

      {/* Scenario Picker & Playback Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 p-2.5 sm:p-3 flex flex-col gap-2 z-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Scenario Select */}
          <select
            value={selectedScenarioId}
            onChange={(e) => handleSelectScenario(Number(e.target.value))}
            className="flex-1 min-w-[240px] bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-amber-400"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* Perspective View Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPerspective('dual')}
              className={`px-2 py-1 rounded font-semibold transition-colors ${
                perspective === 'dual'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual Dashboard
            </button>
            <button
              onClick={() => setPerspective('pedestrian')}
              className={`px-2 py-1 rounded font-semibold transition-colors ${
                perspective === 'pedestrian'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚶 Pedestrian
            </button>
            <button
              onClick={() => setPerspective('driver')}
              className={`px-2 py-1 rounded font-semibold transition-colors ${
                perspective === 'driver'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚗 Driver
            </button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-xs text-amber-300 hover:text-white rounded transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              onClick={() => {
                setSimTime(0);
                setSpeedOverrideKmh(0);
              }}
              className="p-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
              title="Reset Time & Overrides"
            >
              🔄
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setSimTime((t) => Math.min(scenario.durationSeconds, Math.max(0, t - 0.5)));
              }}
              className="p-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
              title="Step Backward (-0.5s)"
            >
              ⏮
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setSimTime((t) => Math.min(scenario.durationSeconds, t + 0.5));
              }}
              className="p-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
              title="Step Forward (+0.5s)"
            >
              ⏭
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            {[0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-mono ${
                  playbackSpeed === spd
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider and Scenario Note */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={scenario.durationSeconds}
            step={0.1}
            value={simTime}
            onChange={(e) => {
              setIsPlaying(false);
              setSimTime(parseFloat(e.target.value));
            }}
            className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-[11px] font-mono text-slate-400 w-16 text-right">
            {simTime.toFixed(1)}s / {scenario.durationSeconds}s
          </span>
        </div>

        {/* Dynamic Vehicle Interactive Control (Emergency Brake / Accelerate) */}
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Vehicle Speed Override:</span>
            <span className="font-mono text-amber-300 font-bold">
              {speedOverrideKmh > 0 ? `+${speedOverrideKmh}` : speedOverrideKmh} km/h
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSpeedOverrideKmh((prev) => prev - 10)}
              className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[11px] font-semibold transition-colors"
            >
              🛑 Hard Brake (-10 km/h)
            </button>
            <button
              onClick={() => setSpeedOverrideKmh(0)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setSpeedOverrideKmh((prev) => prev + 10)}
              className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-[11px] font-semibold transition-colors"
            >
              ⚡ Accelerate (+10 km/h)
            </button>
          </div>
        </div>
      </div>

      {/* SYNCHRONIZED DASHBOARD OF BOTH PEDESTRIAN AND DRIVER */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-2.5 z-20">
        <div
          className={`grid gap-2.5 ${
            perspective === 'dual'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* PEDESTRIAN DASHBOARD CARD */}
          {(perspective === 'dual' || perspective === 'pedestrian') && (
            <div className="bg-slate-950 rounded-xl p-3 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🚶</span>
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Pedestrian Perspective
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      assessment.level === 'RED'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : assessment.level === 'AMBER'
                        ? 'bg-amber-600 text-black'
                        : assessment.level === 'GREEN'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {assessment.level} • {assessment.title}
                  </span>
                </div>
              </div>

              {/* 4 Core Metrics: Collision Time, Distance, Speed, Risk */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {/* 1. Collision Time */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Collision Time</span>
                  <span
                    className={`text-lg sm:text-xl font-mono font-black block mt-0.5 ${
                      primaryVeh?.direction === 'Approaching' && primaryVeh.etaSeconds !== null
                        ? primaryVeh.etaSeconds <= 15
                          ? 'text-rose-400'
                          : 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {primaryVeh?.direction === 'Approaching' && primaryVeh.etaSeconds !== null
                      ? `~${primaryVeh.etaSeconds}s`
                      : primaryVeh?.direction || 'N/A'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {primaryVeh?.uncertaintySeconds ? `(±${primaryVeh.uncertaintySeconds}s)` : 'steady'}
                  </span>
                </div>

                {/* 2. Proximity Distance */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Distance</span>
                  <span
                    className={`text-lg sm:text-xl font-mono font-black block mt-0.5 ${
                      driverDistanceM <= 40
                        ? 'text-rose-400'
                        : driverDistanceM <= 80
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {Math.round(driverDistanceM)} m
                  </span>
                  <span className="text-[9px] text-slate-500">Separation</span>
                </div>

                {/* 3. Speeds */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Vehicle Speed</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-white block mt-0.5">
                    {driverSpeedKmh.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">
                    {(driverSpeedKmh / 3.6).toFixed(1)} m/s
                  </span>
                </div>

                {/* 4. Collision Risk */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Conflict Path</span>
                  <span
                    className={`text-sm sm:text-base font-bold block mt-1 ${
                      primaryVeh?.hasPathConflict ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {primaryVeh?.hasPathConflict ? '⚠️ CONFLICT' : 'CLEAR'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Miss: {primaryVeh?.missDistanceMeters !== null && primaryVeh?.missDistanceMeters !== undefined ? `${primaryVeh.missDistanceMeters.toFixed(1)}m` : '0m'}
                  </span>
                </div>
              </div>

              {/* Pedestrian Context Summary */}
              <div className="mt-2 pt-1.5 border-t border-slate-900 text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  Pedestrian Speed:{' '}
                  <b className="text-white font-mono">{pedSpeedKmh.toFixed(1)} km/h</b> ({(pedSpeedKmh / 3.6).toFixed(1)} m/s)
                </span>
                <span className="text-slate-400">
                  Closing Rate: <b className="text-amber-300 font-mono">{(driverClosingSpeedMs * 3.6).toFixed(0)} km/h</b>
                </span>
              </div>
            </div>
          )}

          {/* DRIVER DASHBOARD CARD */}
          {(perspective === 'dual' || perspective === 'driver') && (
            <div className="bg-slate-950 rounded-xl p-3 border border-emerald-900/60 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🚗</span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Driver Perspective HUD
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      isDriverAlertUrgent
                        ? 'bg-rose-600 text-white animate-pulse'
                        : driverForwardCone.inCone
                        ? 'bg-amber-600 text-black'
                        : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {isDriverAlertUrgent
                      ? 'COLLISION IMMINENT'
                      : driverForwardCone.inCone
                      ? 'PEDESTRIAN IN PATH'
                      : 'CONE CLEAR'}
                  </span>
                </div>
              </div>

              {/* 4 Core Metrics: Collision Time, Distance, Speed, Risk */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {/* 1. Impact ETA */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Impact Time</span>
                  <span
                    className={`text-lg sm:text-xl font-mono font-black block mt-0.5 ${
                      driverCollisionEtaS !== null && driverCollisionEtaS <= 15
                        ? 'text-rose-400'
                        : driverCollisionEtaS !== null
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {driverCollisionEtaS !== null ? `~${driverCollisionEtaS}s` : 'Clear'}
                  </span>
                  <span className="text-[9px] text-slate-500">Time-to-Ped</span>
                </div>

                {/* 2. Distance to Pedestrian */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Distance</span>
                  <span
                    className={`text-lg sm:text-xl font-mono font-black block mt-0.5 ${
                      driverDistanceM <= 40
                        ? 'text-rose-400'
                        : driverDistanceM <= 80
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {Math.round(driverDistanceM)} m
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Req. Stop: {Math.round(driverStoppingDistM)}m
                  </span>
                </div>

                {/* 3. Driver Vehicle Speed */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">My Speed</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-white block mt-0.5">
                    {driverSpeedKmh.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                  </span>
                  <span
                    className={`text-[9px] font-semibold ${
                      driverSpeedKmh > 5 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {driverSpeedKmh > 5 ? '🔒 Settings Locked' : 'Unlocked'}
                  </span>
                </div>

                {/* 4. Forward Cone & Braking Risk */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Vision Cone (45°)</span>
                  <span
                    className={`text-sm sm:text-base font-bold block mt-1 ${
                      driverForwardCone.inCone ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {driverForwardCone.inCone ? '⚠️ IN CONE' : 'CLEAR'}
                  </span>
                  <span
                    className={`text-[9px] font-semibold ${
                      driverCanStop ? 'text-emerald-400' : 'text-rose-400 font-bold'
                    }`}
                  >
                    {driverCanStop ? 'Can Stop in Time' : 'Braking Shortage!'}
                  </span>
                </div>
              </div>

              {/* Driver Safety Summary */}
              <div className="mt-2 pt-1.5 border-t border-slate-900 text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  Heading: <b className="text-white font-mono">{primaryVehRaw?.heading?.toFixed(0) ?? '--'}°</b> | Cone Offset:{' '}
                  <b className="text-slate-200 font-mono">{driverForwardCone.angleOffsetDeg.toFixed(0)}°</b>
                </span>
                <span className={driverCanStop ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                  {driverCanStop ? 'Safe braking margin' : '⚠️ Insufficient stopping distance!'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Map View */}
      <div className="flex-1 relative w-full h-full min-h-[180px]">
        <MapView
          myFix={currentFrame.pedestrianFix}
          myRole={perspective === 'driver' ? 'driver' : 'pedestrian'}
          peers={simulatedPeers}
          crossings={[]}
          autoFollow={true}
          onToggleAutoFollow={() => {}}
          onCenterOnMe={() => {}}
        />

        {/* Live Mathematical Diagnostics Floating Overlay */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 border border-slate-700 rounded-lg p-2.5 text-[10px] font-mono text-slate-300 shadow-xl max-w-xs backdrop-blur-md">
          <div className="font-bold text-amber-300 mb-1 border-b border-slate-800 pb-0.5 flex justify-between">
            <span>LIVE KINEMATICS</span>
            <span>{simTime.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Pedestrian:</span>
            <span className="text-white">{pedFix ? `${pedFix.lat.toFixed(5)}, ${pedFix.lng.toFixed(5)}` : 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span>Vehicle:</span>
            <span className="text-white">{primaryVehRaw ? `${primaryVehRaw.lat.toFixed(5)}, ${primaryVehRaw.lng.toFixed(5)}` : 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span>Distance:</span>
            <span className="font-bold text-amber-300">{driverDistanceM.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between">
            <span>Closing Speed:</span>
            <span className="text-cyan-300">{driverClosingSpeedMs.toFixed(2)} m/s ({(driverClosingSpeedMs * 3.6).toFixed(1)} km/h)</span>
          </div>
          <div className="flex justify-between">
            <span>Collision ETA:</span>
            <span className="font-bold text-rose-300">{driverCollisionEtaS !== null ? `${driverCollisionEtaS} s` : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>CPA Miss Dist:</span>
            <span className="text-white">{primaryVeh?.missDistanceMeters !== null && primaryVeh?.missDistanceMeters !== undefined ? `${primaryVeh.missDistanceMeters.toFixed(1)} m` : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Forward Cone:</span>
            <span className={driverForwardCone.inCone ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {driverForwardCone.inCone ? `YES (${driverForwardCone.angleOffsetDeg.toFixed(0)}°)` : 'NO'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Status Banner */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 z-10">
        <RiskStatusBanner assessment={assessment} />
      </div>
    </div>
  );
};
