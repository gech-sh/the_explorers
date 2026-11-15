# The Explorers ? Martian Map 1.0

A working NASA Space Apps team demonstration for planning science Marswalks with measured terrain, route alternatives, source evidence, and interactive 3D.

## Open the application

On this computer: **https://localhost:8788**. On the current Wi-Fi: **https://172.31.98.222:8788**.

Double-click **Start-Integrated.cmd** to start. Keep the terminal and this PC running while teammates connect. The planner opens directly with no password, account, login, or session timeout. Anyone who can reach this server can view datasets and view, create, or delete shared saved plans.

Each browser must trust `security/explorers-local-ca.crt`. Review and run `security/Trust-Explorers-Certificate.ps1` on each client. Do not bypass browser certificate warnings. Share only the public certificate; never distribute `.secrets` or its private keys. The LAN address must be present in the server certificate.

## Plan a route

1. Choose **Arcadia** or **Jezero**.
2. Enter **From** and **Destination**, use a suggested place, or position the map pins.
3. Choose your walking speed and maximum slope in the left panel.
4. Press **Get directions**. Compare the shortest route with the route that minimizes maximum slope. Both are drawn; select a card to inspect it.
5. Editing a place, speed, or slope clears the paths. Press **Get directions** again to calculate.

Use **3D terrain** in Arcadia to orbit and inspect measured elevation. Relief exaggeration is labeled. Use **Marswalk** to arrange science stops, set duration/distance limits, save a plan, and export or print a briefing. The **Guide** button explains the workflow inside the app.

## Clone the project

The original AR optical and geology sources use Git LFS. Install Git LFS, then clone:

```powershell
git lfs install
git clone https://github.com/gech-sh/the_explorers.git
cd the_explorers
git lfs pull
```

## Install on another host

Requires Windows, Node.js 22.13 or newer, npm, and mkcert. Python 3 is required only for data preparation and security checks.

Copy this folder excluding `node_modules`, `.wrangler`, `.sites-runtime`, `.secrets`, and log files. Keep `backend/data` and `backend/public/data`; these contain the actual datasets. Install mkcert from its official GitHub releases and add it to PATH (or put `mkcert.exe` in `tools`). Run **Setup-Integrated.cmd**. It installs locked dependencies, applies database migrations, builds frontend assets, and creates a new local TLS certificate. Certificate creation does not install trust automatically. Install the new public CA on clients explicitly, then run **Start-Integrated.cmd**.

Allow inbound TCP 8788 only on the host's local subnet if Windows Firewall requires it. Use the LAN address printed at startup. Backend port 8789 stays on loopback. If the address changes, move the existing `.secrets/server.pem` and `server-key.pem` to a private backup, then rerun `security/Setup-LocalTLS.ps1` to issue a certificate covering the new address. Do not regenerate the CA unnecessarily.

Saved missions live in `backend/.wrangler/state`. Back up this directory with the app stopped before updates. A fresh host starts with an empty database. No secrets or saved team records are embedded in a release.

## Build and verify

```powershell
npm run build
npm start
# In another terminal, while the app is running:
npm run verify
```

Verification covers backend routing, input validation, measured datasets, browser worker calculations, direction forms, manual button behavior, science mission save/restore, and HTTPS and password-free access. `RELEASE-NOTES.md` records release status and limitations.

## Evidence and limits

Arcadia combines HiRISE optical/stereo elevation, MOLA/HRSC regional elevation, THEMIS nighttime infrared, archived MCD atmosphere samples, and supplied AR optical/geology records. Jezero uses a prepared measured terrain grid. Source identities and coverage are shown in the app. The Arcadia 100 ? 100 km outline marks dataset coverage; map exploration extends beyond it. Missing elevations and malformed AR attributes are not invented.

?Safest? means minimum peak slope within the available grid and chosen constraints. This research demonstration does not certify astronaut safety, estimate oxygen/battery reserves, or provide live weather. 3D requires WebGL. Global background tiles require Internet; local terrain assets and calculations are served from this PC.

The interface uses Leaflet and Three.js, worker-based terrain analysis, a TypeScript API in a local Cloudflare Workers runtime, and SQLite through D1. The TLS gateway supplies encrypted LAN access without authentication. It is a local team release, not a publicly hosted operational mission system. Further implementation details are in `TECHNICAL-NOTES.md`.
