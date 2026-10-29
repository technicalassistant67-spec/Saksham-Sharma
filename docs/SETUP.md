# SafeCross — Setup & Deployment Guide

This guide describes how to run SafeCross for campus evaluations and real two-phone demonstrations with **zero API keys and zero paid cloud services**.

---

## 1. Running the Local Relay Server (On a Laptop)

SafeCross includes an in-memory WebSocket relay server (`server/server.js`) that runs entirely locally.

### Prerequisites
- Node.js installed (v18+ recommended)
- Laptop and smartphones connected to the **same local Wi-Fi router** OR a **smartphone personal hotspot**.

### Step 1: Start the Relay Server
On your laptop, navigate to the project directory in a terminal:
```bash
node server/server.js
```
You will see:
```text
[SafeCross Relay] WebSocket server active on ws://0.0.0.0:8080
[SafeCross Relay] Connect phones via ws://<LAPTOP_LOCAL_IP>:8080
```

### Step 2: Find Your Laptop's Local IP Address
- **Windows:** Run `ipconfig` in Command Prompt (look for `IPv4 Address`, e.g. `192.168.1.105` or `192.168.43.12`).
- **macOS / Linux:** Run `ifconfig` or `ip a` (look for `inet 192.168.x.x`).

### Step 3: Firewall Configuration
Ensure inbound TCP port `8080` is allowed through your laptop firewall:
- **Windows:** Windows Defender Firewall &rarr; Allow an app or feature &rarr; Allow Node.js on Private networks.
- **macOS:** System Settings &rarr; Network &rarr; Firewall &rarr; Allow incoming connections for Node.js.

---

## 2. Connecting Two Physical Phones

### Option A: Mobile Web Browser / PWA (Zero Install)
You can open SafeCross directly on Android Chrome or Safari:
1. Open the hosted development app URL or your laptop's local URL (`http://<LAPTOP_IP>:3000`).
2. On both phones:
   - Enter the Relay Server WebSocket URL (e.g. `ws://192.168.1.105:8080` or `wss://<app-domain>/ws`).
   - Enter matching 4-character Room Codes (e.g., `DEMO`).
3. Set **Phone 1** to "I'm a Pedestrian".
4. Set **Phone 2** to "I'm a Driver".
5. Allow high-accuracy Location permission when prompted.

### Option B: Keyless Internet Tunneling (Optional for Remote Demos)
If your demo phones cannot connect to your laptop's local Wi-Fi subnet, use Cloudflare's free, keyless quick tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```
This generates a temporary public `https://...trycloudflare.com` URL. In the SafeCross app, enter:
`wss://<tunnel-id>.trycloudflare.com`
(100% free, zero account, zero signup).

---

## 3. Building the Flutter Android APK (Native)

For students compiling the Flutter codebase directly into an `.apk`:
1. Ensure Flutter 3.x and Android SDK 24+ are installed.
2. Install dependencies:
   ```bash
   flutter pub get
   ```
3. Run test suite:
   ```bash
   flutter test
   ```
4. Build release APK:
   ```bash
   flutter build apk --release
   ```
5. Install on connected phone:
   ```bash
   flutter install
   ```

---

## 4. Pre-Downloading Offline Map Tiles
To ensure the map loads swiftly on weak cellular data:
1. Open the map screen while connected to fast Wi-Fi before testing.
2. Pan and zoom around your planned campus road test area.
3. Tiles are cached locally in the browser / app cache for offline fallback.
