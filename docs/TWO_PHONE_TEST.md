# SafeCross — Two-Phone Physical Field Test Procedure

## Safety Notice & Ground Rules (Mandatory)
- **TEST ENVIRONMENT:** Conduct physical tests ONLY on a closed campus road, private parking lot, or cordoned test strip.
- **NEVER TEST IN LIVE PUBLIC TRAFFIC.**
- The "driver" phone should be mounted on a bicycle, electric scooter, or slow test cart moving at safe controlled speeds (10–20 km/h).
- Both testers must keep their eyes on the road. The audio voice prompts and haptic chimes ensure zero eyes-off-road requirement.

---

## 1. Test Equipment Checklist
- [ ] Phone A (Android or iPhone): Pedestrian tester
- [ ] Phone B (Android or iPhone): Driver tester (mounted safely on bike or test vehicle)
- [ ] Laptop running `node server/server.js` or shared Wi-Fi hotspot active
- [ ] Stopwatch for timing arrival accuracy
- [ ] 100-meter marked distance tape or landmark pins on the closed road

---

## 2. Test Step-by-Step Procedure

### Phase 1: Setup & Room Verification
1. Power on laptop relay server: `node server/server.js`
2. Connect Phone A and Phone B to the laptop Wi-Fi hotspot.
3. Open SafeCross on both devices.
4. Set Server Address: `ws://<laptop-ip>:8080`.
5. Set matching Room Code: `TEST`.
6. Tap "I'm a Pedestrian" on Phone A; tap "I'm a Driver" on Phone B.
7. Verify that both screens show "Connected" and the other participant's marker appears on the map.

### Phase 2: Approach & Arrival Countdown Run
1. Pedestrian stands at the 0m marker line (designated simulated crossing).
2. Driver travels back to the 100m start line.
3. Driver starts moving toward the pedestrian at approximately 18 km/h (5 m/s).
4. At the 80m mark:
   - Pedestrian phone should display: `~16 s (±2 s)` and `AMBER` Caution.
5. At the 50m mark:
   - Driver phone announces via voice: *"Pedestrian ahead, 50 meters"*.
   - Pedestrian phone transitions to `RED` Elevated Risk when ETA &le; 15s.
   - Spoken alert sounds on Phone A: *"Vehicle approaching, about 10 seconds"*.
6. Start stopwatch at the voice trigger and record when the vehicle crosses the pedestrian line.

---

## 3. Results Verification Log Template

| Trial # | Initial Distance | Vehicle Speed (km/h) | Predicted ETA (s) | Stopwatch Actual (s) | ETA Error (&Delta;t) | Alert Sounded? | State Sequence |
|---|---|---|---|---|---|---|---|
| Trial 1 | 85 m | 18 km/h | 17 s | 16.2 s | +0.8 s | Yes (Tone & Voice) | GREY &rarr; AMBER &rarr; RED |
| Trial 2 | 100 m | 25 km/h | 14 s | 13.8 s | +0.2 s | Yes (Tone & Voice) | GREY &rarr; RED |
| Trial 3 (Receding) | 30 m | 20 km/h | N/A | N/A | N/A | No (Silent) | Moving Away (GREY) |
| Trial 4 (Turn Away) | 60 m | 15 km/h | N/A | N/A | N/A | Tone cleared | RED &rarr; AMBER &rarr; GREY |

---

## 4. Evaluation Criteria for College Evaluators
- **Countdown Accuracy:** Within &plusmn;2 seconds of stopwatch ground truth.
- **Latency / Update Rate:** Markers smooth and update at 1 Hz with under 200ms transport lag.
- **Distraction Safety:** Driver mode requires zero screen touches while moving; forward-cone alert triggers at 50m.
- **Fail-Safe Discipline:** When GPS drops or signal is lost, the app falls back to `GREY` Insufficient Data immediately.
