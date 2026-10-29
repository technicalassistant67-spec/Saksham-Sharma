/**
 * SafeCross Settings View
 * Audio toggles, multi-language speech, relay configuration, privacy disclosure, and live debug threshold tuning.
 */

import React, { useState } from 'react';
import { SupportedLanguage } from '../core/i18n/translations';
import { globalAlertService } from '../services/alert_service';
import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';

interface SettingsViewProps {
  serverUrl: string;
  onChangeServerUrl: (url: string) => void;
  roomCode: string;
  onChangeRoomCode: (code: string) => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  sharingEnabled: boolean;
  onToggleSharing: () => void;
  onBackToHome: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  serverUrl,
  onChangeServerUrl,
  roomCode,
  onChangeRoomCode,
  language,
  onChangeLanguage,
  sharingEnabled,
  onToggleSharing,
  onBackToHome,
}) => {
  const [soundOn, setSoundOn] = useState(globalAlertService.soundEnabled);
  const [vibrationOn, setVibrationOn] = useState(globalAlertService.vibrationEnabled);

  // Debug editable thresholds
  const [dangerEta, setDangerEta] = useState(DEFAULT_THRESHOLDS.DANGER_ETA_S);
  const [dangerDist, setDangerDist] = useState(DEFAULT_THRESHOLDS.DANGER_DIST_M);
  const [cautionEta, setCautionEta] = useState(DEFAULT_THRESHOLDS.CAUTION_ETA_S);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    globalAlertService.soundEnabled = next;
  };

  const handleToggleVibration = () => {
    const next = !vibrationOn;
    setVibrationOn(next);
    globalAlertService.vibrationEnabled = next;
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    onChangeLanguage(newLang);
    globalAlertService.language = newLang;
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
          <h2 className="text-lg font-bold text-white">Application Settings</h2>
        </div>
      </header>

      {/* Main Settings Sections */}
      <main className="flex-1 py-4 space-y-5">
        {/* Sharing & Audio Toggles */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Real-Time Sharing & Alerts
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div>
              <div className="text-sm font-medium text-white">Broadcast Location Fixes</div>
              <div className="text-xs text-slate-400">Transmits anonymous coordinates to active room</div>
            </div>
            <button
              onClick={onToggleSharing}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                sharingEnabled ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  sharingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div>
              <div className="text-sm font-medium text-white">Audible Voice & Chime Alerts</div>
              <div className="text-xs text-slate-400">Synthesized audio tones and spoken proximity warnings</div>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                soundOn ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  soundOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-white">Haptic Vibration</div>
              <div className="text-xs text-slate-400">Vibration alert patterns on elevated risk</div>
            </div>
            <button
              onClick={handleToggleVibration}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                vibrationOn ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  vibrationOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Voice Announcement Language */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Voice Alert Language
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'en', label: 'English', sub: 'Native en-IN' },
              { id: 'hi', label: 'हिंदी (Hindi)', sub: 'हिन्दी आवाज़' },
              { id: 'mr', label: 'मराठी (Marathi)', sub: 'मराठी आवाज' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleLanguageChange(item.id as SupportedLanguage)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  language === item.id
                    ? 'bg-cyan-950 border-cyan-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Relay Server and Room Code Config */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Relay Server Endpoint
          </h3>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">WebSocket URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => onChangeServerUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => onChangeRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Debug Threshold Live Editor */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Debug Threshold Live Editor
            </h3>
            <span className="text-[10px] text-amber-400">College Demo Tuning</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Danger ETA (RED):</span>
                <span className="font-mono text-cyan-400 font-bold">{dangerEta} s</span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                value={dangerEta}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDangerEta(v);
                  DEFAULT_THRESHOLDS.DANGER_ETA_S = v;
                }}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Danger Distance (RED):</span>
                <span className="font-mono text-cyan-400 font-bold">{dangerDist} m</span>
              </div>
              <input
                type="range"
                min={15}
                max={80}
                value={dangerDist}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDangerDist(v);
                  DEFAULT_THRESHOLDS.DANGER_DIST_M = v;
                }}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Caution ETA (AMBER):</span>
                <span className="font-mono text-amber-400 font-bold">{cautionEta} s</span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                value={cautionEta}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCautionEta(v);
                  DEFAULT_THRESHOLDS.CAUTION_ETA_S = v;
                }}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Privacy Information Disclosure */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300"
          >
            <span>🔒 Privacy & Zero-Retention Notice</span>
            <span>{showPrivacy ? '▲' : '▼'}</span>
          </button>
          {showPrivacy && (
            <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t border-slate-800 pt-3">
              SafeCross does not collect or store personal data. There are no user accounts, passwords, device serials, or persistent databases.
              Telemetric coordinates (lat, lng, speed, heading) are only shared ephemerally with peers connected to your specified Room Code.
              The Node.js relay retains telemetry exclusively in volatile RAM, which is completely erased after 60 seconds of inactivity or upon disconnection.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};
