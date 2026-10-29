# SafeCross — Project Assumptions & External Network Services

## 1. Core Engineering Assumptions
1. **Zero-API-Key Architecture**:
   The entire application runs without third-party API keys, billing accounts, Google Play Services keys, or cloud infrastructure accounts. All services used are public, standard, and free.
2. **Network Services Contacted**:
   The application communicates with exactly three endpoints over the network:
   - **Local / Self-Hosted Relay Server (`ws://<ip>:8080` or `wss://<app-domain>/ws`)**:
     In-memory WebSocket relay server. No telemetry is logged to persistent disk. All data expires after 60 seconds of inactivity or upon socket disconnect.
   - **OpenStreetMap Public Tile Server (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)**:
     Standard raster map tiles. A valid User-Agent is declared and tile caching is active to comply with the OSM Foundation Tile Usage Policy.
   - **OpenStreetMap Overpass API (`https://overpass-api.de/api/interpreter`)**:
     Queried to retrieve verified `highway=crossing` pedestrian zebra nodes within a 300-meter radius. Queries are strictly rate-limited (at most once every 60 seconds, and only when the pedestrian moves > 150 meters). Failures degrade silently without interrupting safety warnings.
3. **Session & Identity Handling**:
   No user accounts, email addresses, phone numbers, or passwords exist. Devices generate an anonymous, ephemeral session identifier (`sc_xxxxxx_xxxx`) per app launch.
4. **Room Code Clustering**:
   Room codes (3–8 alphanumeric characters, e.g., `DEMO`, `CAMPUS1`) group participants in the same test area so multiple college teams can demonstrate independently without crosstalk.
5. **Clock Synchronization**:
   Device hardware clocks drift. Therefore, peer data timestamps are stamped by the relay server (`serverTs`), and clients estimate the round-trip time (RTT) and clock offset using an NTP-style ping/pong handshake.
6. **Flat-Earth Tangent Plane**:
   Because collision warnings occur within 500 meters, planar East-North-Up (ENU) coordinates around the pedestrian provide millimetric vector accuracy with zero spherical distortion.
7. **Left-Hand Traffic Context**:
   Tailored for Indian road conditions (driving on the left, mixed two-wheelers, auto-rickshaws, and pedestrians).
