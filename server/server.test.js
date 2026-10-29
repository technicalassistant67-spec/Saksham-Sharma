/**
 * SafeCross Relay Server Test Suite
 * Tests room isolation, message validation, rate limits, role filtering, and expiry.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RelayManager } from './relay_manager.js';

class MockWebSocket {
  constructor() {
    this.sent = [];
    this.readyState = 1; // OPEN
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
}

test('1. Server Validation: Rejects Malformed or Out-of-Bounds Data', () => {
  const relay = new RelayManager();
  const ws = new MockWebSocket();
  relay.registerConnection(ws, '127.0.0.1');

  // Malformed JSON string
  const res1 = relay.handleMessage(ws, 'not-a-json');
  assert.equal(res1?.error, 'Malformed JSON');

  // Invalid room code (symbols)
  const res2 = relay.handleMessage(
    ws,
    JSON.stringify({ type: 'join', room: '$$$!', sessionId: 'sess-12345', role: 'pedestrian' })
  );
  assert.ok(res2?.error?.includes('Room code must be'));

  // Invalid lat bounds (> 90)
  relay.handleMessage(
    ws,
    JSON.stringify({ type: 'join', room: 'ROOM1', sessionId: 'sess-12345', role: 'pedestrian' })
  );
  const res3 = relay.handleMessage(
    ws,
    JSON.stringify({ type: 'fix', lat: 105.0, lng: 70.0, accuracy: 10, speed: 5, heading: 0 })
  );
  assert.ok(res3?.error?.includes('Latitude out of bounds'));
});

test('2. Room Isolation: Different Rooms Cannot Intercept Telemetry', () => {
  const relay = new RelayManager();
  const wsA = new MockWebSocket();
  const wsB = new MockWebSocket();

  relay.registerConnection(wsA, '127.0.0.1');
  relay.registerConnection(wsB, '127.0.0.1');

  // Client A in ROOM_A
  relay.handleMessage(
    wsA,
    JSON.stringify({ type: 'join', room: 'ROOMA', sessionId: 'sess-ped-A', role: 'pedestrian' })
  );

  // Client B in ROOM_B
  relay.handleMessage(
    wsB,
    JSON.stringify({ type: 'join', room: 'ROOMB', sessionId: 'sess-drv-B', role: 'driver' })
  );

  // Driver B sends fix in ROOM_B
  relay.handleMessage(
    wsB,
    JSON.stringify({ type: 'fix', lat: 19.0, lng: 72.0, accuracy: 5, speed: 10, heading: 90 })
  );

  // Client A in ROOMA must NOT receive snapshot containing Driver B
  const clientASnapshots = wsA.sent.filter((m) => m.type === 'snapshot');
  const foundPeer = clientASnapshots.some((s) =>
    s.participants?.some((p) => p.sessionId === 'sess-drv-B')
  );
  assert.equal(foundPeer, false, 'Client in ROOM_A intercepted peer from ROOM_B');
});

test('3. Role Filtering: Only the OTHER Role Is Received', () => {
  const relay = new RelayManager();
  const wsPed1 = new MockWebSocket();
  const wsPed2 = new MockWebSocket();
  const wsDriver = new MockWebSocket();

  relay.registerConnection(wsPed1, '127.0.0.1');
  relay.registerConnection(wsPed2, '127.0.0.1');
  relay.registerConnection(wsDriver, '127.0.0.1');

  relay.handleMessage(
    wsPed1,
    JSON.stringify({ type: 'join', room: 'TEST1', sessionId: 'ped-1', role: 'pedestrian' })
  );
  relay.handleMessage(
    wsPed2,
    JSON.stringify({ type: 'join', room: 'TEST1', sessionId: 'ped-2', role: 'pedestrian' })
  );
  relay.handleMessage(
    wsDriver,
    JSON.stringify({ type: 'join', room: 'TEST1', sessionId: 'drv-1', role: 'driver' })
  );

  // ped-2 sends fix
  relay.handleMessage(
    wsPed2,
    JSON.stringify({ type: 'fix', lat: 19.0, lng: 72.0, accuracy: 10, speed: 1, heading: 0 })
  );

  // ped-1 should NOT receive ped-2 (same role)
  const ped1Snapshots = wsPed1.sent.filter((m) => m.type === 'snapshot');
  const ped1HasPed2 = ped1Snapshots.some((s) =>
    s.participants?.some((p) => p.sessionId === 'ped-2')
  );
  assert.equal(ped1HasPed2, false, 'Pedestrian received another pedestrian');

  // Driver SHOULD receive ped-2
  const drvSnapshots = wsDriver.sent.filter((m) => m.type === 'snapshot');
  const drvHasPed2 = drvSnapshots.some((s) =>
    s.participants?.some((p) => p.sessionId === 'ped-2')
  );
  assert.equal(drvHasPed2, true, 'Driver failed to receive pedestrian');
});

test('4. Radius Relevance Filter: Participants Beyond 500m Are Excluded', () => {
  const relay = new RelayManager();
  const wsPed = new MockWebSocket();
  const wsFarDriver = new MockWebSocket();

  relay.registerConnection(wsPed, '127.0.0.1');
  relay.registerConnection(wsFarDriver, '127.0.0.1');

  relay.handleMessage(
    wsPed,
    JSON.stringify({ type: 'join', room: 'DIST', sessionId: 'ped-local', role: 'pedestrian' })
  );
  relay.handleMessage(
    wsFarDriver,
    JSON.stringify({ type: 'join', room: 'DIST', sessionId: 'drv-far', role: 'driver' })
  );

  // Pedestrian at 19.0000, 72.0000
  relay.handleMessage(
    wsPed,
    JSON.stringify({ type: 'fix', lat: 19.0000, lng: 72.0000, accuracy: 5, speed: 0, heading: null })
  );

  // Driver 1.5 km away (~0.0135 degrees North)
  relay.handleMessage(
    wsFarDriver,
    JSON.stringify({ type: 'fix', lat: 19.0135, lng: 72.0000, accuracy: 5, speed: 10, heading: 180 })
  );

  const pedSnaps = wsPed.sent.filter((m) => m.type === 'snapshot');
  const latestSnap = pedSnaps[pedSnaps.length - 1];
  const hasFarDriver = latestSnap?.participants?.some((p) => p.sessionId === 'drv-far');
  assert.equal(hasFarDriver, false, 'Driver 1.5 km away was not filtered by 500m radius rule');
});

test('5. Rate Limiting: Max 5 Fixes per Second', () => {
  const relay = new RelayManager();
  const ws = new MockWebSocket();
  relay.registerConnection(ws, '127.0.0.1');

  relay.handleMessage(
    ws,
    JSON.stringify({ type: 'join', room: 'RATE', sessionId: 'rate-1', role: 'driver' })
  );

  let successCount = 0;
  let rateLimitHit = false;

  for (let i = 0; i < 8; i++) {
    const res = relay.handleMessage(
      ws,
      JSON.stringify({ type: 'fix', lat: 19.0, lng: 72.0, accuracy: 5, speed: 5, heading: 0 })
    );
    if (res?.ok) successCount++;
    if (res?.error?.includes('Rate limit')) rateLimitHit = true;
  }

  assert.equal(rateLimitHit, true, 'Rate limit was not triggered');
  assert.equal(successCount, 5, 'Allowed more than 5 fixes in 1 second');
});
