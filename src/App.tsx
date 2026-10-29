/**
 * SafeCross Main Application Component
 * Real GPS data flow, WebSocket relay, motion tracker, peer state synchronization, and navigation.
 */

import { useState, useEffect, useRef } from 'react';
import { HomeView } from './features/HomeView';
import { PedestrianView } from './features/PedestrianView';
import { DriverView } from './features/DriverView';
import { SimulationView } from './features/SimulationView';
import { DiagnosticsView } from './features/DiagnosticsView';
import { SettingsView } from './features/SettingsView';
import { AboutView } from './features/AboutView';
import {
  LocationFix,
  ParticipantSnapshot,
  ParticipantState,
  SystemDiagnostics,
  UserRole,
} from './core/models/types';
import { MotionTracker } from './core/motion/motion_engine';
import { ConnectionState, globalSocketService } from './services/socket_service';
import { SupportedLanguage } from './core/i18n/translations';
import { globalAlertService } from './services/alert_service';
import { DEFAULT_THRESHOLDS } from './core/config/thresholds';

type ActiveScreen =
  | 'home'
  | 'pedestrian'
  | 'driver'
  | 'simulation'
  | 'diagnostics'
  | 'settings'
  | 'about';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('home');
  const [selectedRole, setSelectedRole] = useState<UserRole>('pedestrian');
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  // Server address: automatically default to current host's /ws or ws://localhost:8080
  const [serverUrl, setServerUrl] = useState<string>(() => {
    const saved = localStorage.getItem('safecross_server_url');
    if (saved) return saved;
    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/ws`;
    }
    return 'ws://localhost:8080';
  });

  const [roomCode, setRoomCode] = useState<string>(() => {
    return localStorage.getItem('safecross_room_code') || 'DEMO';
  });

  const [sharingEnabled, setSharingEnabled] = useState<boolean>(true);

  // Local GPS state
  const [myFix, setMyFix] = useState<LocationFix | null>(null);
  const [gpsPermission, setGpsPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [mySpeedKmh, setMySpeedKmh] = useState<number>(0);
  const motionTrackerRef = useRef<MotionTracker>(new MotionTracker(DEFAULT_THRESHOLDS));

  // Peer participants state: Map of sessionId -> ParticipantState
  const [peersMap, setPeersMap] = useState<Map<string, ParticipantState>>(new Map());

  // Connection and latency state
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [rttMs, setRttMs] = useState<number | null>(null);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number>(0);

  // Periodic heartbeat / age updater
  const [, setTick] = useState<number>(0);

  // Persist serverUrl & roomCode
  useEffect(() => {
    localStorage.setItem('safecross_server_url', serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    localStorage.setItem('safecross_room_code', roomCode);
  }, [roomCode]);

  // Request GPS Permission and start watchPosition
  const requestGps = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGpsPermission('denied');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermission('granted');
          handleNewGpsFix(pos);
          resolve(true);
        },
        () => {
          setGpsPermission('denied');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  const handleNewGpsFix = (pos: GeolocationPosition) => {
    const rawFix: LocationFix = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed !== null && !isNaN(pos.coords.speed) ? pos.coords.speed : null,
      heading: pos.coords.heading !== null && !isNaN(pos.coords.heading) ? pos.coords.heading : null,
      timestamp: pos.timestamp || Date.now(),
      altitude: pos.coords.altitude,
    };

    const added = motionTrackerRef.current.addFix(rawFix);
    if (!added) return;

    const motion = motionTrackerRef.current.estimateSpeedAndHeading();
    setMySpeedKmh(motion.speedMs * 3.6);

    const enrichedFix: LocationFix = {
      ...rawFix,
      speed: motion.speedMs,
      heading: motion.heading,
    };
    setMyFix(enrichedFix);

    // Relay fix to server if sharing is enabled
    if (sharingEnabled) {
      globalSocketService.sendFix(
        enrichedFix.lat,
        enrichedFix.lng,
        enrichedFix.accuracy,
        enrichedFix.speed,
        enrichedFix.heading
      );
    }
  };

  // Setup continuous geolocation watch when in active mode
  useEffect(() => {
    if (currentScreen !== 'pedestrian' && currentScreen !== 'driver') return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermission('granted');
        handleNewGpsFix(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermission('denied');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentScreen, sharingEnabled]);

  // Connect to Relay Server on role entrance
  useEffect(() => {
    if (currentScreen !== 'pedestrian' && currentScreen !== 'driver') {
      globalSocketService.disconnect();
      setSocketConnected(false);
      return;
    }

    globalSocketService.setEvents({
      onStateChange: (state: ConnectionState) => {
        setSocketConnected(state === 'connected');
      },
      onSnapshot: (participants: ParticipantSnapshot[]) => {
        setPeersMap((prevMap) => {
          const nextMap = new Map(prevMap);
          const now = Date.now();

          participants.forEach((p) => {
            const existing = nextMap.get(p.sessionId);
            const history = existing ? [...existing.history, p].slice(-8) : [p];
            const dataAge = Math.max(0, (now - p.serverTs) / 1000);

            nextMap.set(p.sessionId, {
              sessionId: p.sessionId,
              role: p.role,
              currentFix: p,
              history,
              smoothedSpeed: p.speed,
              speedSource: p.speed !== null ? 'GPS speed' : 'Estimated',
              derivedHeading: p.heading,
              isStale: dataAge > DEFAULT_THRESHOLDS.STALE_AFTER_S,
              isExpired: dataAge > DEFAULT_THRESHOLDS.EXPIRE_AFTER_S,
              dataAgeSeconds: dataAge,
            });
          });

          return nextMap;
        });
      },
      onParticipantLeft: (sessionId: string) => {
        setPeersMap((prevMap) => {
          const nextMap = new Map(prevMap);
          nextMap.delete(sessionId);
          return nextMap;
        });
      },
      onLatencyUpdate: (rtt: number, offset: number) => {
        setRttMs(rtt);
        setServerClockOffsetMs(offset);
      },
    });

    globalSocketService.connect(serverUrl, roomCode, selectedRole);

    return () => {
      globalSocketService.disconnect();
    };
  }, [currentScreen, selectedRole, serverUrl, roomCode]);

  // Periodic timer for stale checks & age updates (every 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);

      setPeersMap((prevMap) => {
        let changed = false;
        const nextMap = new Map(prevMap);
        const now = Date.now();

        nextMap.forEach((peer, id) => {
          const age = Math.max(0, (now - peer.currentFix.serverTs) / 1000);
          const isStale = age > DEFAULT_THRESHOLDS.STALE_AFTER_S;
          const isExpired = age > DEFAULT_THRESHOLDS.EXPIRE_AFTER_S;

          if (isExpired) {
            nextMap.delete(id);
            changed = true;
          } else if (isStale !== peer.isStale || Math.round(age) !== Math.round(peer.dataAgeSeconds)) {
            nextMap.set(id, {
              ...peer,
              isStale,
              dataAgeSeconds: age,
            });
            changed = true;
          }
        });

        return changed ? nextMap : prevMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute Diagnostics
  const ownFixAge = myFix ? Math.max(0, (Date.now() - myFix.timestamp) / 1000) : null;
  const diagnostics: SystemDiagnostics = {
    gpsActive: myFix !== null,
    gpsPermission,
    gpsAccuracyMeters: myFix?.accuracy ?? null,
    lastFixAgeSeconds: ownFixAge,
    socketConnected,
    socketConnecting: globalSocketService.state === 'connecting' || globalSocketService.state === 'reconnecting',
    socketUrl: serverUrl,
    roomCode,
    sessionId: globalSocketService.sessionId,
    roundTripLatencyMs: rttMs,
    serverClockOffsetMs,
    activeParticipantsCount: peersMap.size,
    dataQualitySummary:
      !socketConnected
        ? 'Offline'
        : myFix && myFix.accuracy <= 20 && (ownFixAge || 0) <= 3
        ? 'Excellent'
        : myFix && myFix.accuracy <= 50
        ? 'Good'
        : 'Degraded',
  };

  const peersList = Array.from(peersMap.values()).filter((p) => !p.isExpired);

  // Screen Routing
  if (currentScreen === 'pedestrian') {
    return (
      <PedestrianView
        myFix={myFix}
        myFixAgeSeconds={ownFixAge ?? 99}
        peerVehicles={peersList}
        isServerConnected={socketConnected}
        serverConnectedDurationS={globalSocketService.getConnectedDurationSeconds()}
        gpsPermission={gpsPermission}
        roomCode={roomCode}
        onBackToHome={() => setCurrentScreen('home')}
        onOpenSettings={() => setCurrentScreen('settings')}
        onRequestGps={requestGps}
      />
    );
  }

  if (currentScreen === 'driver') {
    return (
      <DriverView
        myFix={myFix}
        mySpeedKmh={mySpeedKmh}
        peerPedestrians={peersList}
        isServerConnected={socketConnected}
        roomCode={roomCode}
        onBackToHome={() => setCurrentScreen('home')}
        onOpenSettings={() => setCurrentScreen('settings')}
      />
    );
  }

  if (currentScreen === 'simulation') {
    return <SimulationView onBackToHome={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'diagnostics') {
    return (
      <DiagnosticsView
        diagnostics={diagnostics}
        onBackToHome={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'settings') {
    return (
      <SettingsView
        serverUrl={serverUrl}
        onChangeServerUrl={setServerUrl}
        roomCode={roomCode}
        onChangeRoomCode={setRoomCode}
        language={language}
        onChangeLanguage={(l) => {
          setLanguage(l);
          globalAlertService.language = l;
        }}
        sharingEnabled={sharingEnabled}
        onToggleSharing={() => setSharingEnabled(!sharingEnabled)}
        onBackToHome={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'about') {
    return <AboutView onBackToHome={() => setCurrentScreen('home')} />;
  }

  // Home Screen
  return (
    <HomeView
      onSelectRole={(role) => {
        setSelectedRole(role);
        setCurrentScreen(role === 'pedestrian' ? 'pedestrian' : 'driver');
      }}
      serverUrl={serverUrl}
      onChangeServerUrl={setServerUrl}
      roomCode={roomCode}
      onChangeRoomCode={setRoomCode}
      onOpenSimulation={() => setCurrentScreen('simulation')}
      onOpenDiagnostics={() => setCurrentScreen('diagnostics')}
      onOpenSettings={() => setCurrentScreen('settings')}
      onOpenAbout={() => setCurrentScreen('about')}
      language={language}
      onChangeLanguage={(l) => {
        setLanguage(l);
        globalAlertService.language = l;
      }}
      onRequestGpsPermission={requestGps}
    />
  );
}
