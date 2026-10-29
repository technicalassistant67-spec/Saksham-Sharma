/**
 * SafeCross Driver Mode View (Distraction-Safe HUD)
 * Large text, automatic sharing, zero-tap design, forward-cone alerts, and settings speed-lock.
 */

import React, { useEffect } from 'react';
import { MapView } from '../components/MapView';
import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';
import { isPointInForwardCone } from '../core/geo/calculations';
import { LocationFix, ParticipantState } from '../core/models/types';
import { globalAlertService } from '../services/alert_service';

interface DriverViewProps {
  myFix: LocationFix | null;
  mySpeedKmh: number;
  peerPedestrians: ParticipantState[];
  isServerConnected: boolean;
  roomCode: string;
  onBackToHome: () => void;
  onOpenSettings: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({
  myFix,
  mySpeedKmh,
  peerPedestrians,
  isServerConnected,
  roomCode,
  onBackToHome,
  onOpenSettings,
}) => {
  const isMovingFast = mySpeedKmh > DEFAULT_THRESHOLDS.DRIVER_LOCK_SPEED_KMH;

  // Compute forward-cone pedestrian alerts
  // Cone: 45 degrees half-angle, within DRIVER_ALERT_DIST_M (50m)
  let urgentPedestrian: {
    distanceM: number;
    sessionId: string;
    angleOffsetDeg: number;
  } | null = null;

  if (myFix) {
    for (const ped of peerPedestrians) {
      if (ped.isExpired) continue;
      const cone = isPointInForwardCone(
        myFix.lat,
        myFix.lng,
        myFix.heading,
        ped.currentFix.lat,
        ped.currentFix.lng,
        DEFAULT_THRESHOLDS.DRIVER_CONE_DEG
      );

      if (cone.inCone && cone.distanceM <= DEFAULT_THRESHOLDS.DRIVER_ALERT_DIST_M) {
        if (!urgentPedestrian || cone.distanceM < urgentPedestrian.distanceM) {
          urgentPedestrian = {
            distanceM: cone.distanceM,
            sessionId: ped.sessionId,
            angleOffsetDeg: cone.angleOffsetDeg,
          };
        }
      }
    }
  }

  // Trigger driver forward spoken/tone alert
  useEffect(() => {
    if (urgentPedestrian) {
      globalAlertService.handleDriverPedestrianAlert(urgentPedestrian.distanceM);
    }
  }, [urgentPedestrian?.distanceM, urgentPedestrian?.sessionId]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Distraction-Safe HUD Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            disabled={isMovingFast}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isMovingFast
                ? 'opacity-40 bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            ← Exit
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white">🚗 Driver Mode</span>
              <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                Room: {roomCode}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {isServerConnected ? (
                <span className="text-emerald-400 font-medium">● Transmitting Live Location</span>
              ) : (
                <span className="text-rose-400 font-medium">● Relay Disconnected</span>
              )}
            </div>
          </div>
        </div>

        {/* Speedometer & Settings Lock Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white leading-none">
              {mySpeedKmh.toFixed(0)}
              <span className="text-xs font-normal text-slate-400 ml-1">km/h</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {myFix?.heading !== null && myFix?.heading !== undefined
                ? `Hdg: ${myFix.heading.toFixed(0)}°`
                : 'Hdg: --'}
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            disabled={isMovingFast}
            className={`p-2.5 rounded-xl border transition-colors ${
              isMovingFast
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title={isMovingFast ? 'Settings locked while vehicle in motion' : 'Open Settings'}
          >
            {isMovingFast ? '🔒' : '⚙️'}
          </button>
        </div>
      </header>

      {/* Prominent High-Contrast Distraction-Safe Forward Pedestrian Alert Banner */}
      {urgentPedestrian ? (
        <div className="bg-rose-600 text-white p-4 shadow-2xl flex items-center justify-between z-20 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                Pedestrian Ahead, ~{Math.round(urgentPedestrian.distanceM)} m
              </div>
              <div className="text-xs font-medium text-rose-100">
                Forward cone detected app-sharing pedestrian directly in path!
              </div>
            </div>
          </div>
          <span className="text-3xl font-mono font-black">
            {Math.round(urgentPedestrian.distanceM)}m
          </span>
        </div>
      ) : (
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between z-20">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">●</span> Forward safety cone active (45° forward vision)
          </span>
          <span className="font-mono text-slate-400">
            {peerPedestrians.filter((p) => !p.isExpired).length} Pedestrian(s) within 500m
          </span>
        </div>
      )}

      {/* Moving Speed Warning Notice if moving */}
      {isMovingFast && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-1.5 text-[11px] text-amber-300 text-center z-20 font-medium">
          Vehicle moving &gt; 5 km/h. Distraction lock enabled (settings locked for safety).
        </div>
      )}

      {/* Distraction-Safe High Viewport Map */}
      <div className="flex-1 relative w-full h-full min-h-[300px]">
        <MapView
          myFix={myFix}
          myRole="driver"
          peers={peerPedestrians}
          crossings={[]}
          autoFollow={true}
          onToggleAutoFollow={() => {}}
          onCenterOnMe={() => {}}
        />
      </div>

      {/* Mandatory Safety Notice */}
      <footer className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 leading-tight z-10">
        <span className="font-bold text-slate-300">Driver Disclaimer: </span>
        SafeCross only detects pedestrians running this app. Always yield right of way to all pedestrians and obey traffic signals.
      </footer>
    </div>
  );
};
