/**
 * SafeCross Client WebSocket Service
 * Handles anonymous sessions, auto-reconnect with exponential backoff, ping/pong offset calculation.
 */

import { ParticipantSnapshot, UserRole } from '../core/models/types';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface SocketEvents {
  onStateChange?: (state: ConnectionState) => void;
  onSnapshot?: (participants: ParticipantSnapshot[], serverTime: number) => void;
  onParticipantLeft?: (sessionId: string) => void;
  onLatencyUpdate?: (rttMs: number, serverClockOffsetMs: number) => void;
  onError?: (errMessage: string) => void;
}

export class ClientSocketService {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private roomCode: string = 'DEMO';
  private role: UserRole = 'pedestrian';
  public sessionId: string = '';
  public state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectDelayMs = 10000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private events: SocketEvents = {};
  private lastPingSent = 0;
  public rttMs: number | null = null;
  public serverClockOffsetMs: number = 0;
  private queuedFix: { lat: number; lng: number; accuracy: number; speed: number | null; heading: number | null } | null = null;
  public connectedSince: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return 'sc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  public setEvents(events: SocketEvents) {
    this.events = events;
  }

  public connect(url: string, room: string, role: UserRole) {
    this.disconnect();
    this.serverUrl = url;
    this.roomCode = room.trim().toUpperCase() || 'DEMO';
    this.role = role;
    this.reconnectAttempts = 0;

    this.initiateConnection();
  }

  private initiateConnection() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    this.setState(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');

    try {
      this.ws = new WebSocket(this.serverUrl);
    } catch (e) {
      this.handleSocketFailure('Failed to instantiate WebSocket URL');
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectedSince = Date.now();
      this.setState('connected');

      // Join room
      this.sendRaw({
        type: 'join',
        room: this.roomCode,
        sessionId: this.sessionId,
        role: this.role,
      });

      // Start ping heartbeat (every 3 seconds)
      this.startPingInterval();

      // Flush queued fix if any
      if (this.queuedFix) {
        this.sendFix(
          this.queuedFix.lat,
          this.queuedFix.lng,
          this.queuedFix.accuracy,
          this.queuedFix.speed,
          this.queuedFix.heading
        );
        this.queuedFix = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleIncomingMessage(msg);
      } catch {
        // Ignore unparseable
      }
    };

    this.ws.onclose = () => {
      this.handleSocketFailure('Connection closed by remote');
    };

    this.ws.onerror = () => {
      this.handleSocketFailure('Connection error occurred');
    };
  }

  private handleIncomingMessage(msg: {
    type: string;
    serverTime?: number;
    participants?: ParticipantSnapshot[];
    sessionId?: string;
  }) {
    if (msg.type === 'pong' && typeof msg.serverTime === 'number') {
      const now = Date.now();
      this.rttMs = Math.max(0, now - this.lastPingSent);
      // NTP clock offset estimate: offset = serverTime - (now - RTT/2)
      this.serverClockOffsetMs = Math.round(msg.serverTime - (now - this.rttMs / 2));
      this.events.onLatencyUpdate?.(this.rttMs, this.serverClockOffsetMs);
    } else if (msg.type === 'snapshot' && Array.isArray(msg.participants)) {
      this.events.onSnapshot?.(msg.participants, msg.serverTime || Date.now());
    } else if (msg.type === 'left' && msg.sessionId) {
      this.events.onParticipantLeft?.(msg.sessionId);
    }
  }

  private handleSocketFailure(reason: string) {
    this.stopPingInterval();
    this.connectedSince = null;
    this.setState('disconnected');
    this.events.onError?.(reason);

    // Exponential backoff reconnect
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelayMs);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initiateConnection();
    }, delay);
  }

  public sendFix(
    lat: number,
    lng: number,
    accuracy: number,
    speed: number | null,
    heading: number | null
  ) {
    const payload = {
      type: 'fix',
      lat,
      lng,
      accuracy,
      speed,
      heading,
    };

    if (this.state === 'connected' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw(payload);
    } else {
      // Store latest unsent fix
      this.queuedFix = payload;
    }
  }

  private sendRaw(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch {}
    }
  }

  private startPingInterval() {
    this.stopPingInterval();
    // Immediate ping
    this.sendPing();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 3000);
  }

  private sendPing() {
    if (this.state === 'connected' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.lastPingSent = Date.now();
      this.sendRaw({ type: 'ping' });
    }
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.events.onStateChange?.(newState);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPingInterval();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connectedSince = null;
    this.setState('disconnected');
  }

  public getConnectedDurationSeconds(): number {
    if (!this.connectedSince) return 0;
    return Math.max(0, (Date.now() - this.connectedSince) / 1000);
  }
}

export const globalSocketService = new ClientSocketService();
