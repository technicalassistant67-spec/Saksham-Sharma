/**
 * SafeCross About & Technology Explanation View
 * Plain-language, academically rigorous documentation of algorithms and fundamental physical limitations.
 */

import React from 'react';

interface AboutViewProps {
  onBackToHome: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBackToHome }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-lg font-bold text-white">How SafeCross Works</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 space-y-6 text-xs text-slate-300 leading-relaxed">
        {/* Core Vision */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-cyan-400">1. Problem & Context</h3>
          <p>
            On Indian urban and suburban roads, pedestrian crossings are frequently unmarked, and traffic is heterogeneous (two-wheelers, auto-rickshaws, cars, buses).
            Pedestrians struggle to judge approaching vehicle closing speeds, while drivers often fail to see pedestrians early at night or around blind turns.
          </p>
          <p>
            SafeCross creates an ad-hoc, 100% keyless, peer-to-peer telemetry loop. Pedestrians receive an accurate time-to-collision countdown, and drivers receive forward-cone voice alerts.
          </p>
        </section>

        {/* Mathematical Foundation */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3 font-sans">
          <h3 className="text-sm font-bold text-cyan-400">2. Mathematical Engine</h3>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">A. Great-Circle Haversine Distance ($R = 6,371,000$ m)</h4>
            <p className="font-mono bg-slate-950 p-2 rounded text-[11px] text-cyan-300">
              a = sin²(Δφ/2) + cos(φ₁)cos(φ₂)sin²(Δλ/2)<br />
              c = 2 · atan2(√a, √(1−a))<br />
              d = R · c
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">B. Local Flat-Earth ENU Projection</h4>
            <p>
              Around the pedestrian origin (0, 0), coordinates are converted to tangent plane meters:
              North (y) = R &times; (&phi; &minus; &phi;&omicron;), East (x) = R &times; (&lambda; &minus; &lambda;&omicron;) &times; cos(&phi;&omicron;).
              This enables high-speed Euclidean vector dot products without expensive spherical trigonometry.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">C. Closing Speed & Vector Projection</h4>
            <p>
              The vehicle velocity vector [vx = speed &times; sin(heading), vy = speed &times; cos(heading)] is projected onto the unit line-of-sight vector pointing towards the pedestrian:
            </p>
            <p className="font-mono bg-slate-950 p-2 rounded text-[11px] text-cyan-300">
              v_closing = (v_x &times; (&minus;x_veh) + v_y &times; (&minus;y_veh)) / distance
            </p>
            <p>
              If v_closing &le; 0.5 m/s, the vehicle is classified as &ldquo;Not approaching&rdquo;.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">D. Closest Point of Approach (CPA) & Conflict Corridor</h4>
            <p>
              The time to closest approach is t_CPA = &minus;(r0 &sdot; v) / |v|&sup2;. If t_CPA &gt; 0, the projected lateral miss distance is calculated.
              If miss distance &le; 8.0 m, a path conflict is flagged.
            </p>
          </div>
        </section>

        {/* 4-State Priority Logic */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-cyan-400">3. Four-State Crossing Logic</h3>
          <p>Evaluated strictly in priority order: <b>RED &gt; AMBER &gt; GREY &gt; GREEN</b>:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><b className="text-rose-400">RED (Elevated Risk):</b> Approaching vehicle within ETA ≤ 15s or distance ≤ 40m with path intersection.</li>
            <li><b className="text-amber-400">AMBER (Caution):</b> Approaching vehicle with 15s &lt; ETA ≤ 30s, or uncertain sensor accuracy (20–50m).</li>
            <li><b className="text-slate-400">GREY (Insufficient Data):</b> GPS accuracy &gt; 50m, fix age &gt; 5s, or relay link offline.</li>
            <li><b className="text-emerald-400">GREEN (Clear of SafeCross vehicles):</b> Shown ONLY when GPS accuracy ≤ 20m, fix age ≤ 3s, server connected ≥ 10s, and no vehicles within caution radius. Never says "safe".</li>
          </ul>
        </section>

        {/* Fundamental Limitations */}
        <section className="bg-slate-900 rounded-xl p-4 border border-rose-950/80 space-y-2">
          <h3 className="text-sm font-bold text-rose-400">4. Fundamental Limitations</h3>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li><b>Smartphone GPS Error:</b> Consumer GNSS chips exhibit 5–15m errors, exacerbated in urban canyons by building multipath reflections.</li>
            <li><b>Non-Participant Invisibility:</b> Vehicles, cycles, or pedestrians without the app running are completely invisible to SafeCross.</li>
            <li><b>Constant Velocity Assumption:</b> ETAs assume current velocity vectors and do not model emergency braking or abrupt lane changes.</li>
            <li><b>Network Latency:</b> Cellular or Wi-Fi jitter introduces 50–500ms transmission delays.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};
