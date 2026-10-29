/**
 * SafeCross Alert Service
 * Audio synthesizer, haptics, and text-to-speech with 8-second cooldown & state-change logic.
 */

import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';
import { SupportedLanguage } from '../core/i18n/translations';
import { RiskLevel } from '../core/models/types';

export class AlertService {
  private lastAlertLevel: RiskLevel | null = null;
  private lastAlertTimestamp: number = 0;
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public vibrationEnabled: boolean = true;
  public language: SupportedLanguage = 'en';

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Triggers haptic vibration if supported
   */
  private triggerVibration(pattern: number | number[]) {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if vibration is blocked
      }
    }
  }

  /**
   * Synthesizes audio tones using Web Audio API (keyless, zero asset files required)
   */
  private playSynthesizedTone(type: 'urgent' | 'caution') {
    if (!this.soundEnabled) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'urgent') {
        // Urgent alternating dual-tone beep
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Soft single chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio playback safety catch
    }
  }

  /**
   * Spoken alert via native Text-to-Speech
   */
  public speak(text: string) {
    if (!this.soundEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = this.language === 'hi' ? 'hi' : this.language === 'mr' ? 'mr' : 'en';
      const matchingVoice = voices.find((v) => v.lang.startsWith(langPrefix));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silently if TTS not ready
    }
  }

  /**
   * Evaluate risk level alert:
   * RED: vibration + synthesized tone + spoken warning
   * AMBER: soft tone
   * GREEN & GREY: no sound
   * Alert only on level change or after ALERT_COOLDOWN_S (8s)
   */
  public handleCrossingRiskAlert(level: RiskLevel, etaSeconds: number | null) {
    const now = Date.now();
    const cooldownMs = DEFAULT_THRESHOLDS.ALERT_COOLDOWN_S * 1000;
    const isLevelChange = level !== this.lastAlertLevel;
    const isCooldownElapsed = now - this.lastAlertTimestamp >= cooldownMs;

    if (!isLevelChange && !isCooldownElapsed) {
      return; // Suppressed by cooldown
    }

    if (level === 'RED') {
      this.lastAlertLevel = 'RED';
      this.lastAlertTimestamp = now;

      // Haptic: 3 short bursts
      this.triggerVibration([200, 100, 200, 100, 300]);
      this.playSynthesizedTone('urgent');

      let speechText = 'Warning: Vehicle approaching!';
      if (this.language === 'en') {
        speechText =
          etaSeconds !== null
            ? `Vehicle approaching, about ${etaSeconds} seconds.`
            : 'Vehicle approaching, very close!';
      } else if (this.language === 'hi') {
        speechText =
          etaSeconds !== null
            ? `सावधान: वाहन आ रहा है, लगभग ${etaSeconds} सेकंड!`
            : 'सावधान: वाहन निकट आ रहा है!';
      } else if (this.language === 'mr') {
        speechText =
          etaSeconds !== null
            ? `धोका: वाहन जवळ येत आहे, सुमारे ${etaSeconds} सेकंद!`
            : 'धोका: वाहन अतिशय जवळ आहे!';
      }
      this.speak(speechText);
    } else if (level === 'AMBER') {
      this.lastAlertLevel = 'AMBER';
      this.lastAlertTimestamp = now;

      this.triggerVibration(150);
      this.playSynthesizedTone('caution');
    } else {
      // GREEN or GREY: reset lastAlertLevel if changed, no audio triggered
      this.lastAlertLevel = level;
    }
  }

  /**
   * Driver mode forward pedestrian alert
   */
  public handleDriverPedestrianAlert(distanceMeters: number) {
    const now = Date.now();
    const cooldownMs = DEFAULT_THRESHOLDS.ALERT_COOLDOWN_S * 1000;

    if (now - this.lastAlertTimestamp < cooldownMs) {
      return;
    }

    this.lastAlertTimestamp = now;
    this.triggerVibration([300, 150, 300]);
    this.playSynthesizedTone('urgent');

    const roundedDist = Math.round(distanceMeters);
    let speech = `Pedestrian ahead, ${roundedDist} meters`;
    if (this.language === 'hi') {
      speech = `आगे पैदल यात्री है, ${roundedDist} मीटर`;
    } else if (this.language === 'mr') {
      speech = `पुढे पादचारी आहे, ${roundedDist} मीटर`;
    }
    this.speak(speech);
  }
}

export const globalAlertService = new AlertService();
