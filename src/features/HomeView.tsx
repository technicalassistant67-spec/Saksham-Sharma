/**
 * SafeCross Home Screen & First-Run Onboarding
 * Tagline: SafeCross — Navigate Smarter. Stay Aware
 * 3-Card Onboarding with permission request triggered ONLY after tapping Continue.
 */

import React, { useState } from 'react';
import { UserRole } from '../core/models/types';
import { SupportedLanguage, TRANSLATIONS } from '../core/i18n/translations';

interface HomeViewProps {
  onSelectRole: (role: UserRole) => void;
  serverUrl: string;
  onChangeServerUrl: (url: string) => void;
  roomCode: string;
  onChangeRoomCode: (code: string) => void;
  onOpenSimulation: () => void;
  onOpenDiagnostics: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onRequestGpsPermission: () => Promise<boolean>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectRole,
  serverUrl,
  onChangeServerUrl,
  roomCode,
  onChangeRoomCode,
  onOpenSimulation,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenAbout,
  language,
  onChangeLanguage,
  onRequestGpsPermission,
}) => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('safecross_onboarding_completed') !== 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [isRequestingGps, setIsRequestingGps] = useState<boolean>(false);
  const t = TRANSLATIONS[language];

  const handleFinishOnboarding = async () => {
    setIsRequestingGps(true);
    await onRequestGpsPermission();
    setIsRequestingGps(false);
    localStorage.setItem('safecross_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header & Language Selector */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/30">
            SC
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
              SafeCross
            </h1>
            <p className="text-[11px] text-cyan-400 font-medium tracking-wide mt-0.5">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          {(['en', 'hi', 'mr'] as SupportedLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => onChangeLanguage(lang)}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                language === lang
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-center py-6 gap-6">
        {/* Value Proposition */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Navigate Smarter.<br />Stay Aware.
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Real-time proximity safety alerting prototype for pedestrians and drivers on Indian mixed-traffic roads.
          </p>
        </div>

        {/* Relay Server and Room Code Configuration */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Relay Connection (No Key / No Account)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {t.serverAddress}
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => onChangeServerUrl(e.target.value)}
                placeholder="ws://192.168.1.100:8080"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {t.roomCode} (4-8 letters/digits)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => onChangeRoomCode(e.target.value.toUpperCase())}
                placeholder="DEMO"
                maxLength={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Both demo phones must use the same Room Code. Telemetry is held strictly in memory and expires automatically.
          </p>
        </div>

        {/* Primary Role Selection Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelectRole('pedestrian')}
            className="w-full py-4 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl shadow-lg shadow-cyan-950/60 border border-cyan-400/30 flex items-center justify-between group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 text-left">
              <span className="text-3xl p-2 bg-white/10 rounded-xl">🚶</span>
              <div>
                <div className="text-lg font-bold tracking-wide">{t.pedestrianMode}</div>
                <div className="text-xs text-cyan-100/80">{t.pedestrianDescription}</div>
              </div>
            </div>
            <span className="text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => onSelectRole('driver')}
            className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl shadow-lg shadow-emerald-950/60 border border-emerald-400/30 flex items-center justify-between group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 text-left">
              <span className="text-3xl p-2 bg-white/10 rounded-xl">🚗</span>
              <div>
                <div className="text-lg font-bold tracking-wide">{t.driverMode}</div>
                <div className="text-xs text-emerald-100/80">{t.driverDescription}</div>
              </div>
            </div>
            <span className="text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Simulation Mode Callout */}
        <button
          onClick={onOpenSimulation}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl border border-amber-500/40 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-colors"
        >
          <span>🧪</span> Launch 10-Scenario Simulation Lab (DEMO ONLY)
        </button>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="pt-4 border-t border-slate-900 grid grid-cols-3 gap-2 text-center">
        <button
          onClick={onOpenDiagnostics}
          className="py-2.5 px-3 bg-slate-900/60 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800/80 transition-colors"
        >
          📊 Diagnostics
        </button>
        <button
          onClick={onOpenSettings}
          className="py-2.5 px-3 bg-slate-900/60 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800/80 transition-colors"
        >
          ⚙️ Settings
        </button>
        <button
          onClick={onOpenAbout}
          className="py-2.5 px-3 bg-slate-900/60 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800/80 transition-colors"
        >
          📖 About & Math
        </button>
      </footer>

      {/* First-Run Onboarding Modal (3 Cards) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">
                SafeCross Onboarding • Step {onboardingStep} of 3
              </span>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Skip
              </button>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-3">
                <div className="text-4xl text-center py-2">📍</div>
                <h3 className="text-lg font-bold text-white text-center">
                  Why Location is Needed
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SafeCross continuously computes closing speed, time-to-collision (ETA), and lateral miss distances between pedestrians and approaching vehicles.
                  High-frequency GPS fixes allow live math without cameras or roadside sensors.
                </p>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-3">
                <div className="text-4xl text-center py-2">🔒</div>
                <h3 className="text-lg font-bold text-white text-center">
                  What is Shared & Privacy
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Only anonymous coordinates, speed, and heading are relayed over your designated Room Code.
                  No accounts, passwords, phone numbers, or user profiles exist. Everything is held in volatile memory on the relay server and expires automatically after 60 seconds.
                </p>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-3">
                <div className="text-4xl text-center py-2">⚠️</div>
                <h3 className="text-lg font-bold text-white text-center">
                  Crucial Safety Limitations
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SafeCross only detects phones running this app. Other vehicles, bicycles, animals, and pedestrians are NOT detected.
                  SafeCross is never a replacement for your eyes, ears, or traffic signals. Always look both ways before stepping onto the street.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {onboardingStep > 1 ? (
                <button
                  onClick={() => setOnboardingStep((s) => s - 1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {onboardingStep < 3 ? (
                <button
                  onClick={() => setOnboardingStep((s) => s + 1)}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg ml-auto"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleFinishOnboarding}
                  disabled={isRequestingGps}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg ml-auto flex items-center gap-1.5"
                >
                  {isRequestingGps ? 'Requesting GPS...' : 'Continue & Allow Location'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
