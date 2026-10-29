/**
 * SafeCross Four-State Crossing Status Banner (Section 7)
 * Strictly follows the priority order RED > AMBER > GREY > GREEN.
 * Never uses "Safe" or "Safe to cross". Includes permanent disclaimer.
 */

import React from 'react';
import { CrossingStatusAssessment } from '../core/models/types';

interface RiskStatusBannerProps {
  assessment: CrossingStatusAssessment;
}

export const RiskStatusBanner: React.FC<RiskStatusBannerProps> = ({ assessment }) => {
  const { level, title, description, disclaimer } = assessment;

  // Accessible color, border, and badge styles per state
  const getBannerStyles = () => {
    switch (level) {
      case 'RED':
        return {
          wrapper: 'bg-rose-950/90 border-rose-600 text-rose-100 shadow-rose-950/50',
          badge: 'bg-rose-600 text-white',
          icon: '🛑',
          accent: 'text-rose-300',
        };
      case 'AMBER':
        return {
          wrapper: 'bg-amber-950/90 border-amber-600 text-amber-100 shadow-amber-950/50',
          badge: 'bg-amber-600 text-black font-bold',
          icon: '⚠️',
          accent: 'text-amber-300',
        };
      case 'GREEN':
        return {
          wrapper: 'bg-emerald-950/90 border-emerald-600 text-emerald-100 shadow-emerald-950/50',
          badge: 'bg-emerald-600 text-white',
          icon: '👁️',
          accent: 'text-emerald-300',
        };
      case 'GREY':
      default:
        return {
          wrapper: 'bg-slate-900 border-slate-700 text-slate-200 shadow-slate-950/50',
          badge: 'bg-slate-700 text-slate-200',
          icon: 'ℹ️',
          accent: 'text-slate-400',
        };
    }
  };

  const style = getBannerStyles();

  return (
    <div className="flex flex-col gap-2">
      {/* Primary Status Card */}
      <div
        className={`w-full p-3.5 rounded-xl border-2 shadow-lg backdrop-blur-md transition-all ${style.wrapper}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">
              {style.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wide uppercase">
                  {title}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${style.badge}`}
                >
                  {level}
                </span>
              </div>
              <p className="text-xs mt-0.5 leading-snug font-medium text-slate-200">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permanent Mandatory Disclaimer (Section 2 & 7) */}
      <div className="px-3 py-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-tight">
        <span className="font-semibold text-slate-300">Notice: </span>
        {disclaimer}
      </div>
    </div>
  );
};
