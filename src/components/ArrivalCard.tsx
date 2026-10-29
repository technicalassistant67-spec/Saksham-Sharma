/**
 * SafeCross Pedestrian Arrival-Time Card (Section 6)
 * Top of screen, high contrast, live 1-second countdown, source attribution, and multi-vehicle list.
 */

import React, { useEffect, useState } from 'react';
import { CrossingStatusAssessment, VehicleRiskInfo } from '../core/models/types';

interface ArrivalCardProps {
  assessment: CrossingStatusAssessment;
  activeVehiclesCount: number;
}

export const ArrivalCard: React.FC<ArrivalCardProps> = ({
  assessment,
  activeVehiclesCount,
}) => {
  const primary = assessment.primaryVehicle;
  const [localEta, setLocalEta] = useState<number | null>(primary?.etaSeconds ?? null);
  const [lastFixAge, setLastFixAge] = useState<number>(primary?.dataAgeSeconds ?? 0);

  // Sync localEta whenever primary vehicle fix updates
  useEffect(() => {
    setLocalEta(primary?.etaSeconds ?? null);
    setLastFixAge(primary?.dataAgeSeconds ?? 0);
  }, [primary?.etaSeconds, primary?.dataAgeSeconds, primary?.sessionId]);

  // Local 1-second interval countdown between GPS updates
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalEta((prev) => {
        if (prev === null) return null;
        if (prev <= 0) return 0;
        return prev - 1;
      });
      setLastFixAge((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format direction badge color
  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case 'Approaching':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'Moving away':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      default:
        return 'text-slate-400 bg-slate-800/80 border-slate-700';
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 shadow-xl p-4 flex flex-col gap-3">
      {/* Top Bar: Primary Vehicle Live Arrival */}
      {primary ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Approaching Vehicle Telemetry
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Fix: {lastFixAge.toFixed(0)}s ago
            </span>
          </div>

          {/* Big High-Contrast Arrival Countdown */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Estimated Time to Crossing</div>
              {primary.direction === 'Approaching' && localEta !== null ? (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-300 font-mono">
                    ~{localEta}s
                  </span>
                  {primary.uncertaintySeconds !== null && (
                    <span className="text-xs text-slate-400 font-mono">
                      (±{primary.uncertaintySeconds}s)
                    </span>
                  )}
                </div>
              ) : primary.direction === 'Moving away' ? (
                <div className="text-xl font-bold text-emerald-400 mt-1">Moving away</div>
              ) : (
                <div className="text-xl font-bold text-slate-400 mt-1">Not approaching</div>
              )}
            </div>

            {/* Quick Distance & Closing Speed Metrics */}
            <div className="text-right">
              <div className="text-2xl font-bold text-white font-mono">
                {Math.round(primary.distanceMeters)} m
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {primary.closingSpeedMs > 0.5 ? (
                  <span className="text-amber-400 font-mono">
                    {(primary.closingSpeedMs * 3.6).toFixed(0)} km/h closing
                  </span>
                ) : (
                  <span className="text-slate-500">Non-closing</span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Telemetry Details */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Speed Source</span>
              <span className="font-semibold text-slate-200">{primary.speedSource}</span>
              <span className="text-slate-400 block text-[11px] font-mono">
                {primary.speedKmh.toFixed(0)} km/h
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Direction</span>
              <span
                className={`inline-block px-1.5 py-0.5 mt-0.5 rounded text-[10px] border font-medium ${getDirectionBadge(
                  primary.direction
                )}`}
              >
                {primary.direction}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Miss Distance (CPA)</span>
              <span className="font-semibold text-slate-200 font-mono">
                {primary.missDistanceMeters !== null
                  ? `${Math.round(primary.missDistanceMeters)} m`
                  : 'N/A'}
              </span>
              <span
                className={`text-[10px] block ${
                  primary.hasPathConflict ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                {primary.hasPathConflict ? '⚠️ Path conflict' : 'No conflict'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-sm font-medium text-slate-300">
            {activeVehiclesCount === 0
              ? 'No SafeCross vehicles sharing in this room'
              : 'ETA unavailable — insufficient data'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {activeVehiclesCount === 0
              ? 'Vehicles within 500m running SafeCross will show live arrival calculations.'
              : 'Acquiring valid GPS speed and bearing vectors...'}
          </div>
        </div>
      )}

      {/* Multi-Vehicle List (Sorted by soonest ETA) */}
      {assessment.allVehicles.length > 1 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>All Tracked Vehicles ({assessment.allVehicles.length})</span>
            <span className="text-[10px] text-slate-500">Sorted by arrival priority</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto pr-1">
            {assessment.allVehicles.map((v, idx) => (
              <div
                key={v.sessionId}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
                  idx === 0
                    ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{idx === 0 ? '🚨' : '🚗'}</span>
                  <div>
                    <span className="font-mono text-[11px] font-semibold">
                      Veh #{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1.5">
                      {Math.round(v.distanceMeters)}m
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  {v.etaSeconds !== null ? `ETA ~${v.etaSeconds}s` : v.direction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
