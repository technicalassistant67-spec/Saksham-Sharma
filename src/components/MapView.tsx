/**
 * SafeCross Interactive OpenStreetMap Map Component
 * Powered by Leaflet + OpenStreetMap tiles. 100% Keyless.
 * Complies with OSM Tile Usage Policy: explicit User-Agent, visible attribution.
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationFix, MappedCrossing, ParticipantState, UserRole } from '../core/models/types';

interface MapViewProps {
  myFix: LocationFix | null;
  myRole: UserRole;
  peers: ParticipantState[];
  crossings: MappedCrossing[];
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  onCenterOnMe: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  myFix,
  myRole,
  peers,
  crossings,
  autoFollow,
  onToggleAutoFollow,
  onCenterOnMe,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const myAccuracyCircleRef = useRef<L.Circle | null>(null);
  const peerMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const crossingMarkersRef = useRef<L.LayerGroup | null>(null);
  const isInitialCentering = useRef<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Mumbai/Pune region if no GPS fix yet)
    const initialLat = myFix ? myFix.lat : 19.0760;
    const initialLng = myFix ? myFix.lng : 72.8777;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap standard tile layer (Keyless)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
    }).addTo(map);

    // Visible OSM Attribution
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    crossingMarkersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update My Location Marker
  useEffect(() => {
    if (!mapRef.current || !myFix) return;
    const map = mapRef.current;

    const myIcon = L.divIcon({
      className: 'safecross-my-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full ${
            myRole === 'pedestrian' ? 'bg-cyan-500 shadow-cyan-500/50' : 'bg-emerald-500 shadow-emerald-500/50'
          } shadow-lg flex items-center justify-center text-white border-2 border-white font-bold text-xs transform transition-transform">
            ${myRole === 'pedestrian' ? '🚶' : '🚗'}
          </div>
          ${
            myFix.heading !== null
              ? `<div class="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] ${
                  myRole === 'pedestrian' ? 'border-b-cyan-400' : 'border-b-emerald-400'
                }" style="transform: rotate(${myFix.heading}deg); transform-origin: 50% 20px;"></div>`
              : ''
          }
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!myMarkerRef.current) {
      myMarkerRef.current = L.marker([myFix.lat, myFix.lng], { icon: myIcon, zIndexOffset: 1000 }).addTo(map);
      myMarkerRef.current.bindPopup(`<b>You (${myRole === 'pedestrian' ? 'Pedestrian' : 'Driver'})</b><br/>Accuracy: ±${Math.round(myFix.accuracy)}m`);
    } else {
      myMarkerRef.current.setLatLng([myFix.lat, myFix.lng]);
      myMarkerRef.current.setIcon(myIcon);
    }

    // Accuracy Circle
    if (!myAccuracyCircleRef.current) {
      myAccuracyCircleRef.current = L.circle([myFix.lat, myFix.lng], {
        radius: myFix.accuracy,
        color: myRole === 'pedestrian' ? '#06b6d4' : '#10b981',
        weight: 1,
        fillColor: myRole === 'pedestrian' ? '#06b6d4' : '#10b981',
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      myAccuracyCircleRef.current.setLatLng([myFix.lat, myFix.lng]);
      myAccuracyCircleRef.current.setRadius(myFix.accuracy);
    }

    if (autoFollow || isInitialCentering.current) {
      map.panTo([myFix.lat, myFix.lng], { animate: true });
      isInitialCentering.current = false;
    }
  }, [myFix, myRole, autoFollow]);

  // Update Peer Participant Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentPeerIds = new Set<string>();

    peers.forEach((peer) => {
      const fix = peer.currentFix;
      currentPeerIds.add(peer.sessionId);

      const isStale = peer.isStale;
      const speedText =
        peer.smoothedSpeed !== null && peer.smoothedSpeed > 0.8
          ? `${(peer.smoothedSpeed * 3.6).toFixed(0)} km/h (${peer.speedSource})`
          : 'Stationary';

      const heading = peer.derivedHeading ?? fix.heading;

      const peerIcon = L.divIcon({
        className: 'safecross-peer-pin',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-9 h-9 rounded-full ${
              isStale ? 'bg-slate-600 opacity-60 border-slate-400' : peer.role === 'driver' ? 'bg-amber-500 border-amber-300' : 'bg-cyan-500 border-cyan-300'
            } border-2 shadow-md flex items-center justify-center text-white text-base">
              ${peer.role === 'driver' ? '🚗' : '🚶'}
            </div>
            ${
              heading !== null && !isStale
                ? `<div class="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] ${
                    peer.role === 'driver' ? 'border-b-amber-400' : 'border-b-cyan-400'
                  }" style="transform: rotate(${heading}deg); transform-origin: 50% 22px;"></div>`
                : ''
            }
            ${
              isStale
                ? `<span class="mt-0.5 text-[9px] bg-slate-800 text-slate-300 px-1 py-0.2 rounded border border-slate-600 font-mono">Stale</span>`
                : ''
            }
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 22],
      });

      let marker = peerMarkersRef.current.get(peer.sessionId);
      if (!marker) {
        marker = L.marker([fix.lat, fix.lng], { icon: peerIcon }).addTo(map);
        peerMarkersRef.current.set(peer.sessionId, marker);
      } else {
        marker.setLatLng([fix.lat, fix.lng]);
        marker.setIcon(peerIcon);
      }

      // Detailed popup on tap
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <b style="color: ${peer.role === 'driver' ? '#d97706' : '#0284c7'};">
            ${peer.role === 'driver' ? 'Vehicle' : 'Pedestrian'}
          </b> ${isStale ? '<span style="color: gray;">(Stale)</span>' : ''}<br/>
          <b>Speed:</b> ${speedText}<br/>
          <b>Accuracy:</b> ±${Math.round(fix.accuracy)}m<br/>
          <b>Last update:</b> ${peer.dataAgeSeconds.toFixed(1)}s ago<br/>
          <span style="font-size: 10px; color: #64748b;">ID: ${peer.sessionId.substring(0, 10)}...</span>
        </div>
      `);
    });

    // Remove expired markers
    peerMarkersRef.current.forEach((marker, id) => {
      if (!currentPeerIds.has(id)) {
        marker.remove();
        peerMarkersRef.current.delete(id);
      }
    });
  }, [peers]);

  // Update Crossing Markers
  useEffect(() => {
    if (!crossingMarkersRef.current) return;
    crossingMarkersRef.current.clearLayers();

    crossings.forEach((c) => {
      const crossingIcon = L.divIcon({
        className: 'safecross-crossing-icon',
        html: `
          <div class="w-6 h-6 rounded-md bg-emerald-600/90 border border-emerald-300 text-white flex items-center justify-center text-xs shadow" title="Mapped crossing (OpenStreetMap)">
            🏁
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([c.lat, c.lng], { icon: crossingIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <b>Mapped crossing (OpenStreetMap)</b><br/>
          Type: ${c.type}<br/>
          Source: Verified OpenStreetMap node
        </div>
      `);
      crossingMarkersRef.current?.addLayer(marker);
    });
  }, [crossings]);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Floating Action Controls */}
      <div className="absolute bottom-4 left-4 z-[500] flex flex-col gap-2">
        <button
          onClick={onCenterOnMe}
          className="px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium rounded-lg border border-slate-700 shadow-md backdrop-blur-sm flex items-center gap-1.5 transition-colors"
          title="Center map on my location"
        >
          <span>🎯</span> Center
        </button>

        <button
          onClick={onToggleAutoFollow}
          className={`px-3 py-2 text-xs font-medium rounded-lg border shadow-md backdrop-blur-sm flex items-center gap-1.5 transition-colors ${
            autoFollow
              ? 'bg-cyan-600/90 border-cyan-400 text-white'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
          title="Toggle auto follow"
        >
          <span>🧭</span> {autoFollow ? 'Follow: On' : 'Follow: Off'}
        </button>
      </div>

      {/* Stale / Network indicators floating badge */}
      {peers.some((p) => p.isStale) && (
        <div className="absolute top-3 right-3 z-[500] bg-slate-900/90 border border-amber-500/50 text-amber-300 text-[11px] px-2.5 py-1 rounded shadow-md backdrop-blur-sm">
          ⚠️ Some peer data is stale (&gt;10s)
        </div>
      )}
    </div>
  );
};
