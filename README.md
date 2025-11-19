# Interactive Streaming Queue & Automation System

This project is a sanitized version of a system I built to manage a live signup
queue across YouTube chat, overlays, and OBS.

It demonstrates how to integrate:

- **Google Apps Script + Google Sheets** (queue backend & web API)
- **Nightbot** (chat commands wired to HTTP endpoints)
- **PowerShell** (overlay file updates + OBS WebSocket control)
- **Text-based overlays** (for “Now reading” / “Up next” / count displays)

The goal is to show how a lightweight, event-friendly automation stack can be
wired together without any proprietary data or secrets.

## Components

- `apps-script/Code.gs` – Google Apps Script web app that exposes text + JSON
  endpoints backed by a Google Sheet.
- `powershell/Update-Overlays.ps1` – Script that polls the web app, updates
  overlay text files, and optionally calls OBS WebSocket.
- `docs/api-contract.md` – REST API contract for the Apps Script web app.
- `docs/nightbot-commands.md` – Example Nightbot command configuration.
- `docs/architecture-overview.md` – End-to-end flow description.
- `examples/sample_stats_response.json` – Example JSON payload for stats.
- `overlay_templates/*.txt` – Example overlay text files.

## How It Works (High Level)

1. A **Google Sheet** holds the queue: viewer name, status, timestamps, etc.
2. A **Google Apps Script** web app provides URLs that:
   - Return text snippets for Nightbot (`!queue`, `!spot`, `!wait`)
   - Return JSON payloads for overlay updates
3. A **PowerShell** script runs on the streaming machine to:
   - Call the web app periodically
   - Write now/next/count to local `.txt` files
   - Optionally send OBS WebSocket commands to toggle scenes or sources
4. **OBS** is configured to display the text files as overlays.

This repo is meant as a **reference architecture / portfolio piece**, not a
drop-in product. You will need to:

- Add your own Google Sheet + web app deployment
- Configure your own Nightbot commands
- Plug in your OBS WebSocket host/port/password and source names
