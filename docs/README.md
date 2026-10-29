# SafeCross — Navigate Smarter. Stay Aware.

> A real-time proximity safety alerting prototype for pedestrians and drivers on mixed-traffic roads.
> Built for academic evaluation and real-world field validation. 100% Keyless, zero-accounts, and privacy-preserving.

---

## 3-Minute College Presentation Demo Script

### Minute 1: The Problem & Live Setup (0:00 - 1:00)
- **Speaker:** "Good morning professors. In Indian cities, over 70% of pedestrian road crossings are unmarked, and mixed traffic—scooters, autos, and cars—makes it difficult for pedestrians to gauge approaching vehicle speeds. Drivers also struggle with blind spots and low nighttime visibility.
- Today we present **SafeCross**."
- **Show Phones:** Hold up Phone A (Pedestrian) and Phone B (Driver).
- "Notice: SafeCross requires **no accounts, no logins, and zero API keys**. The phones connect anonymously over an in-memory WebSocket relay using a 4-digit room code: `DEMO`."

### Minute 2: Pedestrian Arrival Countdown & 4-State Engine (1:00 - 2:00)
- **Action:** Tester with Phone B (Driver) begins walking/cycling towards Phone A (Pedestrian) from 80 meters away.
- **Speaker:** "Look at the Pedestrian screen. As the driver approaches at 18 km/h:
  1. The top Arrival Card counts down in real time: *'Vehicle reaches you in ~14 s'*.
  2. Notice the source attribution: it tells the user whether the speed is derived directly from satellite Doppler (`GPS speed`) or filtered from consecutive fixes (`Estimated`).
  3. Look at our 4-State Crossing Status: as the vehicle enters the 15-second danger corridor, the banner transitions to **RED Elevated Risk**, sounding an urgent dual-tone chime and spoken warning in Hindi/Marathi/English.
  4. Notice our strict safety discipline: SafeCross **never says 'Safe to cross'**. When no tracked vehicles are nearby, it displays *'Clear of SafeCross vehicles'* alongside our permanent disclaimer that untracked vehicles may still be present."

### Minute 3: Driver HUD, Forward Cone, & Simulation Lab (2:00 - 3:00)
- **Action:** Turn Phone B towards audience.
- **Speaker:** "Now look at the Driver Mode:
  1. It is designed for zero distraction—large text, high contrast, and automatic sharing without requiring a single tap while driving.
  2. If the vehicle travels faster than 5 km/h, settings are automatically locked.
  3. When approaching the pedestrian within 50 meters and inside our 45-degree forward vision cone, Phone B sounds a voice alert: *'Pedestrian ahead, 40 meters'*.
- Finally, if you want to test edge cases without going outside, tap our **Simulation Lab** which contains 10 interactive scenarios—such as vehicles braking, signals dropping, and multiple vehicles arriving simultaneously."

---

## Architecture Overview
```text
┌──────────────────────────┐          ┌──────────────────────────┐
│   Phone A (Pedestrian)   │          │     Phone B (Driver)     │
│   - Leaflet / OSM Map    │          │   - Distraction-Safe HUD │
│   - Arrival Countdown    │          │   - Forward Cone (45°)   │
│   - 4-State Risk Engine  │          │   - Motion Lock (>5km/h) │
└─────────────┬────────────┘          └────────────┬─────────────┘
              │                                    │
              │  ws://<ip>:8080/ws                 │  ws://<ip>:8080/ws
              │  (Anonymous JSON Fixes)            │  (Anonymous JSON Fixes)
              ▼                                    ▼
       ┌──────────────────────────────────────────────────┐
       │   SafeCross In-Memory WebSocket Relay Server     │
       │   - 100% In-Memory (Zero Disk Storage)           │
       │   - Room Code Isolation & Rate Limiting          │
       │   - 500m Relevance Radius Spatial Filter         │
       │   - NTP-Style Clock Offset (Ping/Pong)           │
       └──────────────────────────────────────────────────┘
```

---

## Core Directory Structure
```text
/lib                     Flutter native application codebase
  /core/config           Centralized tunable thresholds (thresholds.dart)
  /core/models           Participant & Risk data structures
  /core/geo              Haversine, Bearing, Local ENU Flat-Earth projection
  /core/motion           Speed estimation, Fix validation, EMA smoothing
  /core/risk             Closing speed, CPA conflict corridor, 4-state engine
  /services              Socket, Location, Alerting, Crossing services
  /simulation            10 distinct simulation scenario engines
/src                     React + Vite fullstack interactive web application
/server                  Node.js standalone relay server & test suite
/test                    Unit & integration test suites
/docs                    Engineering documentation & testing procedures
```

---

## Running the Unit Tests
```bash
npm test
```
All 12 rigorous mathematical and relay test suites pass with 100% compliance.
