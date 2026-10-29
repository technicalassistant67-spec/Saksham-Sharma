/**
 * SafeCross Status and Diagnostics View
 * Inspects real-time GPS telemetry, network latency, server clock offset, and active mathematical thresholds.
 */

import React from 'react';
import { SystemDiagnostics } from '../core/models/types';
import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';

interface DiagnosticsViewProps {
  diagnostics: SystemDiagnostics;
  onBackToHome: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  diagnostics,
  onBackToHome,
}) => {
  const getQualityBadgeColor = (summary: string) => {
    switch (summary) {
      case 'Excellent':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'Good':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
      case 'Degraded':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      default:
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 max-w-xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Diagnostics & Telemetry</h2>
            <p className="text-[11px] text-slate-400">Live system health & mathematical inspection</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getQualityBadgeColor(
            diagnostics.dataQualitySummary
          )}`}
        >
          {diagnostics.dataQualitySummary}
        </span>
      </header>

      {/* Main Diagnostics Cards */}
      <main className="flex-1 py-4 space-y-4">
        {/* Real-Time Telemetry Grid */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sensor & Link State
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">GPS Permission</span>
              <span className="font-bold text-white uppercase text-sm mt-0.5 block">
                {diagnostics.gpsPermission}
              </span>
              <span className="text-[10px] text-slate-400">
                {diagnostics.gpsActive ? 'Sensor active' : 'Sensor idle'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">GPS Horizontal Accuracy</span>
              <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                {diagnostics.gpsAccuracyMeters !== null
                  ? `±${Math.round(diagnostics.gpsAccuracyMeters)} m`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400">
                {diagnostics.gpsAccuracyMeters !== null && diagnostics.gpsAccuracyMeters <= 20
                  ? 'High precision (<= 20m)'
                  : 'Degraded accuracy'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Relay Server Link</span>
              <span
                className={`font-bold text-sm mt-0.5 block ${
                  diagnostics.socketConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {diagnostics.socketConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {diagnostics.socketUrl}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Latency & Clock Offset</span>
              <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                {diagnostics.roundTripLatencyMs !== null
                  ? `${diagnostics.roundTripLatencyMs} ms RTT`
                  : 'Measuring...'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Offset: {diagnostics.serverClockOffsetMs} ms
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Last Fix Age</span>
              <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                {diagnostics.lastFixAgeSeconds !== null
                  ? `${diagnostics.lastFixAgeSeconds.toFixed(1)} s`
                  : 'No fix yet'}
              </span>
              <span className="text-[10px] text-slate-400">
                {diagnostics.lastFixAgeSeconds !== null && diagnostics.lastFixAgeSeconds > 10
                  ? 'Marked Stale (>10s)'
                  : 'Fresh fix stream'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Active Room Peers</span>
              <span className="font-mono font-bold text-cyan-400 text-sm mt-0.5 block">
                {diagnostics.activeParticipantsCount} peer(s)
              </span>
              <span className="text-[10px] text-slate-400">
                Room: {diagnostics.roomCode}
              </span>
            </div>
          </div>
        </section>

        {/* Centralized Thresholds Inspector */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Mathematical Thresholds
            </h3>
            <span className="text-[10px] text-slate-500">lib/core/config/thresholds.dart</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            {Object.entries(DEFAULT_THRESHOLDS).map(([key, value]) => (
              <div
                key={key}
                className="bg-slate-950 p-2 rounded border border-slate-800 font-mono"
              >
                <span className="text-slate-500 block text-[9px] truncate" title={key}>
                  {key}
                </span>
                <span className="font-bold text-cyan-300">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
