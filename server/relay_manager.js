/**
 * SafeCross In-Memory Relay Manager
 * Strictly keyless, zero-disk, anonymous, memory-only state manager.
 */

const EARTH_RADIUS_M = 6371000;
const RELEVANCE_RADIUS_M = 500;
const EXPIRE_AFTER_MS = 60 * 1000;
const MAX_FIXES_PER_SEC = 5;
const MAX_MSG_SIZE = 1024; // 1 KB max per message

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = degToRad(lat1);
  const phi2 = degToRad(lat2);
  const deltaPhi = degToRad(lat2 - lat1);
  const deltaLambda = degToRad(lon2 - lon1);
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export class RelayManager {
  constructor() {
    // roomCode -> Map of sessionId -> Participant
    this.rooms = new Map();
    // socket -> client metadata
    this.clients = new Map();
  }

  registerConnection(ws, ip = 'unknown') {
    this.clients.set(ws, {
      ip,
      room: null,
      sessionId: null,
      role: null,
      recentFixTimestamps: [],
      isAlive: true,
      lastSnapshotTs: 0,
    });
  }

  handleDisconnect(ws) {
    const meta = this.clients.get(ws);
    if (!meta) return;

    if (meta.room && meta.sessionId) {
      const roomParticipants = this.rooms.get(meta.room);
      if (roomParticipants) {
        roomParticipants.delete(meta.sessionId);
        if (roomParticipants.size === 0) {
          this.rooms.delete(meta.room);
        } else {
          this.broadcastLeft(meta.room, meta.sessionId);
        }
      }
    }
    this.clients.delete(ws);
  }

  handleMessage(ws, rawData) {
    const meta = this.clients.get(ws);
    if (!meta) return null;

    if (typeof rawData !== 'string' && !(rawData instanceof Buffer)) {
      return { error: 'Invalid data format' };
    }

    if (rawData.length > MAX_MSG_SIZE) {
      return { error: 'Message exceeds maximum allowed size (1 KB)' };
    }

    let msg;
    try {
      msg = JSON.parse(rawData.toString());
    } catch {
      return { error: 'Malformed JSON' };
    }

    if (!msg || typeof msg !== 'object' || !msg.type) {
      return { error: 'Missing message type' };
    }

    switch (msg.type) {
      case 'ping':
        return this.handlePing(ws);

      case 'join':
        return this.handleJoin(ws, meta, msg);

      case 'fix':
        return this.handleFix(ws, meta, msg);

      default:
        return { error: `Unknown message type: ${msg.type}` };
    }
  }

  handlePing(ws) {
    try {
      ws.send(JSON.stringify({ type: 'pong', serverTime: Date.now() }));
    } catch {}
    return { ok: true };
  }

  handleJoin(ws, meta, msg) {
    const { room, sessionId, role } = msg;

    // Strict validation
    if (typeof room !== 'string' || !/^[A-Za-z0-9]{3,8}$/.test(room)) {
      return { error: 'Room code must be 3-8 alphanumeric characters' };
    }

    if (typeof sessionId !== 'string' || sessionId.length < 3 || sessionId.length > 64) {
      return { error: 'Invalid session ID' };
    }

    const normalizedRole = role === 'pedestrian' ? 'pedestrian' : role === 'driver' || role === 'vehicle' ? 'driver' : null;
    if (!normalizedRole) {
      return { error: 'Role must be pedestrian or driver/vehicle' };
    }

    // Clean up previous room if switching
    if (meta.room && meta.sessionId) {
      const oldRoom = this.rooms.get(meta.room);
      if (oldRoom) {
        oldRoom.delete(meta.sessionId);
      }
    }

    meta.room = room.toUpperCase();
    meta.sessionId = sessionId;
    meta.role = normalizedRole;

    if (!this.rooms.has(meta.room)) {
      this.rooms.set(meta.room, new Map());
    }

    const roomMap = this.rooms.get(meta.room);
    roomMap.set(sessionId, {
      sessionId,
      role: normalizedRole,
      ws,
      lat: null,
      lng: null,
      accuracy: null,
      speed: null,
      heading: null,
      serverTs: Date.now(),
    });

    try {
      ws.send(
        JSON.stringify({
          type: 'joined',
          room: meta.room,
          sessionId,
          role: normalizedRole,
          serverTime: Date.now(),
        })
      );
    } catch {}

    // Send immediate snapshot of existing other-role participants
    this.sendSnapshotToClient(ws, meta);
    return { ok: true };
  }

  handleFix(ws, meta, msg) {
    if (!meta.room || !meta.sessionId || !meta.role) {
      return { error: 'Must join a room before transmitting fixes' };
    }

    // Rate limiting: max 5 fixes per second
    const now = Date.now();
    meta.recentFixTimestamps = meta.recentFixTimestamps.filter((ts) => now - ts < 1000);
    if (meta.recentFixTimestamps.length >= MAX_FIXES_PER_SEC) {
      return { error: 'Rate limit exceeded (max 5 fixes/sec)' };
    }
    meta.recentFixTimestamps.push(now);

    const { lat, lng, accuracy, speed, heading } = msg;

    // Strict numerical bounds validation
    if (typeof lat !== 'number' || lat < -90 || lat > 90 || isNaN(lat)) {
      return { error: 'Latitude out of bounds [-90, 90]' };
    }
    if (typeof lng !== 'number' || lng < -180 || lng > 180 || isNaN(lng)) {
      return { error: 'Longitude out of bounds [-180, 180]' };
    }
    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 1000 || isNaN(accuracy)) {
      return { error: 'Accuracy invalid' };
    }
    if (speed !== null && speed !== undefined) {
      if (typeof speed !== 'number' || speed < 0 || speed > 70 || isNaN(speed)) {
        return { error: 'Speed out of realistic bounds [0, 70] m/s' };
      }
    }
    if (heading !== null && heading !== undefined) {
      if (typeof heading !== 'number' || heading < 0 || heading > 360 || isNaN(heading)) {
        return { error: 'Heading out of bounds [0, 360]' };
      }
    }

    const roomMap = this.rooms.get(meta.room);
    if (!roomMap) return { error: 'Room does not exist' };

    const participant = roomMap.get(meta.sessionId);
    if (!participant) return { error: 'Participant not registered in room' };

    // Update in-memory fix
    participant.lat = lat;
    participant.lng = lng;
    participant.accuracy = accuracy;
    participant.speed = speed ?? null;
    participant.heading = heading ?? null;
    participant.serverTs = now;

    // Broadcast snapshot to peers of the OTHER role in this room within 500m
    this.broadcastSnapshotsForRoom(meta.room);

    return { ok: true };
  }

  broadcastSnapshotsForRoom(roomCode) {
    const roomMap = this.rooms.get(roomCode);
    if (!roomMap) return;

    for (const [, client] of roomMap) {
      const meta = this.clients.get(client.ws);
      if (meta && client.ws.readyState === 1 /* OPEN */) {
        this.sendSnapshotToClient(client.ws, meta);
      }
    }
  }

  sendSnapshotToClient(ws, meta) {
    if (!meta.room) return;
    const roomMap = this.rooms.get(meta.room);
    if (!roomMap) return;

    const me = roomMap.get(meta.sessionId);
    const myLat = me ? me.lat : null;
    const myLng = me ? me.lng : null;

    const snapshotList = [];
    const now = Date.now();

    for (const [otherSessionId, other] of roomMap) {
      // Rule: Send only participants of the OTHER role
      if (otherSessionId === meta.sessionId) continue;
      if (other.role === meta.role) continue;
      if (other.lat === null || other.lng === null) continue;

      // Stale check
      if (now - other.serverTs > EXPIRE_AFTER_MS) continue;

      // Distance filter: within 500m of receiving client (if receiver has fix)
      if (myLat !== null && myLng !== null) {
        const dist = haversineDistance(myLat, myLng, other.lat, other.lng);
        if (dist > RELEVANCE_RADIUS_M) {
          continue;
        }
      }

      snapshotList.push({
        sessionId: other.sessionId,
        role: other.role,
        lat: other.lat,
        lng: other.lng,
        accuracy: other.accuracy,
        speed: other.speed,
        heading: other.heading,
        serverTs: other.serverTs,
      });
    }

    try {
      ws.send(
        JSON.stringify({
          type: 'snapshot',
          participants: snapshotList,
          serverTime: now,
        })
      );
    } catch {}
  }

  broadcastLeft(roomCode, sessionId) {
    const roomMap = this.rooms.get(roomCode);
    if (!roomMap) return;

    const msg = JSON.stringify({ type: 'left', sessionId });
    for (const [, participant] of roomMap) {
      if (participant.ws.readyState === 1 /* OPEN */) {
        try {
          participant.ws.send(msg);
        } catch {}
      }
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [roomCode, roomMap] of this.rooms) {
      for (const [sessionId, participant] of roomMap) {
        if (now - participant.serverTs > EXPIRE_AFTER_MS) {
          roomMap.delete(sessionId);
          this.broadcastLeft(roomCode, sessionId);
        }
      }
      if (roomMap.size === 0) {
        this.rooms.delete(roomCode);
      }
    }
  }

  getStats() {
    let totalParticipants = 0;
    for (const [, roomMap] of this.rooms) {
      totalParticipants += roomMap.size;
    }
    return {
      activeRooms: this.rooms.size,
      activeParticipants: totalParticipants,
      connectedSockets: this.clients.size,
    };
  }
}
