# SafeCross — System Limitations & Future Scope

## 1. Technical & Physical Limitations

### A. Smartphone GNSS / GPS Inaccuracies
- **Multipath Reflections:** High-rise structures, flyovers, and dense tree cover reflect satellite signals, creating position inaccuracies of 5 to 25 meters. SafeCross handles this by displaying an explicit uncertainty window (e.g. `~12 s (±3 s)`) and transitioning to `AMBER` caution or `GREY` insufficient data when accuracy degrades beyond 20m/50m.
- **Vertical Inaccuracy:** Smartphone GNSS altitude error is typically 2–3x larger than horizontal error; therefore, SafeCross restricts calculations to 2D planar geometry.

### B. Untracked Road Users (Critical Safety Boundary)
- SafeCross **only detects smartphones running the active app on the same room code**.
- Vehicles, bicycles, motorcycles, street vendors, and pedestrians not transmitting telemetry are **completely invisible** to the software.
- The app therefore enforces permanent disclaimers on both pedestrian and driver screens and never guarantees safety or says "Safe to cross".

### C. Kinematic Assumptions
- The arrival-time countdown assumes constant velocity along the current vector ($\vec{v} = \text{const}$).
- Sharp turns, panic braking, or rapid acceleration between GPS updates are only captured on the subsequent fix (typically 1 Hz).

### D. Unencrypted Local Network Relay (`ws://`)
- For offline campus demos over local Wi-Fi or phone hotspots, the server runs plain `ws://` without TLS.
- In production deployment over the public internet, TLS reverse proxies (`wss://`) and ephemeral session authentication tokens should be mandated.

## 2. Planned Future Improvements
1. **Dead Reckoning via Sensor Fusion (IMU):** Integrate accelerometer and gyroscope step-counting / wheel-revolution estimation to bridge 1-second GPS intervals and indoor or tunnel blackouts.
2. **Dynamic Road Geometry Alignment:** Snap participant trajectories to OpenStreetMap road vectors and crosswalk geometries to reduce false-positive lateral conflict warnings.
3. **BLE (Bluetooth Low Energy) / Wi-Fi Direct Peer-to-Peer:** Implement direct device-to-device ad-hoc mesh communication to remove reliance on a central relay server when off-grid.
4. **Adaptive Cooldown Machine:** Scale alert audio repetition dynamically based on closing acceleration ($a = \Delta v / \Delta t$).
