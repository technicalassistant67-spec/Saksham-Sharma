/**
 * SafeCross Pedestrian Mode View
 * High-contrast arrival countdown, 4-state risk evaluation, Leaflet map with peer vehicles, and crossing tags.
 */

import React, { useState, useEffect } from 'react';
import { ArrivalCard } from '../components/ArrivalCard';
import { RiskStatusBanner } from '../components/RiskStatusBanner';
import { MapView } from '../components/MapView';
import {
  CrossingStatusAssessment,
  LocationFix,
  MappedCrossing,
  ParticipantState,
} from '../core/models/types';
import { evaluateCrossingStatus } from '../core/risk/risk_engine';
import { globalAlertService } from '../services/alert_service';
import { globalCrossingService } from '../services/crossing_service';

interface PedestrianViewProps {
  myFix: LocationFix | null;
  myFixAgeSeconds: number;
  peerVehicles: ParticipantState[];
  isServerConnected: boolean;
  serverConnectedDurationS: number;
  gpsPermission: 'prompt' | 'granted' | 'denied';
  roomCode: string;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onRequestGps: () => void;
}

export const PedestrianView: React.FC<PedestrianViewProps> = ({
  myFix,
  myFixAgeSeconds,
  peerVehicles,
  isServerConnected,
  serverConnectedDurationS,
  gpsPermission,
  roomCode,
  onBackToHome,
  onOpenSettings,
  onRequestGps,
}) => {
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [crossings, setCrossings] = useState<MappedCrossing[]>([]);

  // Evaluate 4-state Crossing Status
  const assessment: CrossingStatusAssessment = evaluateCrossingStatus({
    pedestrianFix: myFix,
    pedestrianFixAgeS: myFixAgeSeconds,
    vehicles: peerVehicles,
    isServerConnected,
    serverConnectedDurationS,
  });

  // Trigger alerts via globalAlertService (cooldown & state change enforced)
  useEffect(() => {
    globalAlertService.handleCrossingRiskAlert(
      assessment.level,
      assessment.primaryVehicle?.etaSeconds ?? null
    );
  }, [assessment.level, assessment.primaryVehicle?.etaSeconds]);

  // Fetch OpenStreetMap crossings around pedestrian location
  useEffect(() => {
    if (!myFix) return;
    let isCancelled = false;
    globalCrossingService.getCrossingsNear(myFix.lat, myFix.lng).then((results) => {
      if (!isCancelled) {
        setCrossings(results);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [myFix?.lat, myFix?.lng]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top App Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Leave and return to home"
          >
            ← Exit
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">🚶 Pedestrian Mode</span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded">
                Room: {roomCode}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {isServerConnected ? (
                <span className="text-emerald-400">● Live Relay Active</span>
              ) : (
                <span className="text-rose-400">● Relay Disconnected</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              globalAlertService.soundEnabled = !globalAlertService.soundEnabled;
            }}
            className="p-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200"
            title="Toggle Alert Sounds"
          >
            {globalAlertService.soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200"
            title="Open Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Network / GPS Warning Banners if degraded */}
      {gpsPermission === 'denied' && (
        <div className="bg-rose-950 border-b border-rose-800 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-20">
          <span>⚠️ Location permission denied. Real-time safety calculations paused.</span>
          <button
            onClick={onRequestGps}
            className="underline font-bold text-white hover:text-rose-100 ml-2"
          >
            Enable GPS
          </button>
        </div>
      )}

      {!isServerConnected && gpsPermission !== 'denied' && (
        <div className="bg-amber-950 border-b border-amber-800 px-4 py-1.5 text-[11px] text-amber-200 text-center z-20">
          ⚠️ Server link disconnected. Reconnecting with exponential backoff...
        </div>
      )}

      {/* Arrival Card (Top of screen, large high-contrast) */}
      <div className="z-10">
        <ArrivalCard
          assessment={assessment}
          activeVehiclesCount={peerVehicles.filter((v) => !v.isExpired).length}
        />
      </div>

      {/* Interactive Map View */}
      <div className="flex-1 relative w-full h-full min-h-[220px]">
        <MapView
          myFix={myFix}
          myRole="pedestrian"
          peers={peerVehicles}
          crossings={crossings}
          autoFollow={autoFollow}
          onToggleAutoFollow={() => setAutoFollow((prev) => !prev)}
          onCenterOnMe={() => setAutoFollow(true)}
        />

        {/* Floating Overpass Crossing Status Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 border border-slate-700 text-slate-300 text-[10px] px-2.5 py-1 rounded shadow-md backdrop-blur-sm pointer-events-none">
          🏁 {globalCrossingService.statusMessage}
        </div>
      </div>

      {/* 4-State Crossing Status & Permanent Disclaimer (Bottom Tray) */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 z-10">
        <RiskStatusBanner assessment={assessment} />
      </div>
    </div>
  );
};
