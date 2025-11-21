# Developer Guide — Live Stream Queue Automation System

This document is for **developers and technical reviewers** who want a deeper understanding of how this project works and how to extend it.

---

## 1. Design Goals

- **Robust for live usage:** The system is designed to run for hours under real streaming conditions.
- **No dedicated backend server:** Everything is implemented using:
  - Google Apps Script (serverless API)
  - Google Sheets (state)
  - PowerShell (automation)
  - OBS WebSocket v5 (visual layer)
- **Modular:** Each component can be replaced or extended independently.
- **Approachable:** A non-developer streamer can use it as-is; a developer can expand it significantly.

---

## 2. Repository Layout (Developer View)

```text
live-stream-queue-automation-system/
├─ README.md                         # High-level overview and user story
├─ nextSession.bat                   # Simple runner for PowerShell script
│
├─ apps_script/
│  └─ Code.gs                        # Google Apps Script web app
│
├─ powershell/
│  └─ update_overlays.ps1            # PowerShell integration + OBS WebSocket calls
│
├─ nightbot/
│  └─ commands.md                    # Nightbot custom commands (urlfetch-based)
│
├─ obs/
│  └─ SETUP.md                       # Instructions for configuring OBS
│
└─ overlays/
   └─ .gitkeep                       # Folder for text files OBS reads
```

---

## 3. Google Apps Script — Core API

The Apps Script file `apps_script/Code.gs` provides a **minimal REST-like API** over HTTP.

### 3.1 Configuration

At the top of the file:

```js
const SHEET_ID   = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Form Responses 1';
const UP_NEXT_N  = 4;
```

- `SHEET_ID` — the Google Sheet that stores queue entries
- `SHEET_NAME` — the specific tab to read from
- `UP_NEXT_N` — how many upcoming participants to list in “Up Next”

### 3.2 HTTP Entry Point

Apps Script exposes a `doGet(e)` handler:

```js
function doGet(e) {
  const params = e.parameter || {};
  // route based on params.queue, params.spot, params.next, etc.
}
```

The handler routes to specific functions based on query parameters:

- `?queue=1` → `queue_()`  
- `?spot=1234` → `spot_(token)`  
- `?wait=1` → alias for `queue_()` or similar  
- `?next=1` → `next_()`  

Each function encapsulates a specific behavior:

- `queue_()` — returns a queue summary, approximated wait time, positions, counts  
- `spot_()` — returns a message about a specific viewer’s position  
- `next_()` — advances the queue pointer and returns updated state

The API responses are simple strings for chat, and can be extended to JSON if you want more structured clients.

---

## 4. Queue Model

The queue model is intentionally kept simple so it stays transparent during live events.

Key aspects often include:

- **A pointer** to the “current” row (by index, timestamp, or boolean flag)
- Derived values:
  - Number of completed sessions
  - Number of remaining requests
  - Average duration per session (rough)
  - Estimated wait time based on queue length × average duration

While not all of these metrics need to be fully implemented at first, the structure of `Code.gs` makes it easy to add new computed fields.

---

## 5. PowerShell Automation

The script `powershell/update_overlays.ps1` performs three main tasks:

1. **Calls the Apps Script web app** with either:
   - `?queue=1` (for a read-only refresh)
   - `?next=1` (to advance the queue and refresh)
2. **Parses the returned payload** into elements for:
   - Now active
   - Up next list
   - Session count
3. **Writes overlay files** and adjusts OBS sources:
   - Updates `overlays/now_active.txt`
   - Updates `overlays/up_next.txt`
   - Updates `overlays/session_count.txt`
   - Connects via WebSocket to OBS
   - Toggles visibility of a group called `"First Timer Toast!"` if appropriate

### 5.1 OBS WebSocket Integration

OBS WebSocket v5 is used via JSON messages over a WebSocket connection.

PowerShell:

- Connects to `ws://127.0.0.1:4455`
- Authenticates with the configured password
- Sends requests to:
  - Show/hide sources
  - Show/hide groups
  - Optionally toggle scenes (if extended)

If you want to add new behaviors (like changing scenes or modifying filters), you can hook additional WebSocket messages into the script.

---

## 6. Nightbot Integration

The `nightbot/commands.md` file includes commands like:

```text
!queue → $(urlfetch https://YOUR_WEB_APP_URL/exec?queue=1)
!wait  → $(urlfetch https://YOUR_WEB_APP_URL/exec?queue=1)
!spot  → $(urlfetch https://YOUR_WEB_APP_URL/exec?spot=$(query))
```

These are simple wrappers around your web app.

Developers can:

- Add additional commands (e.g. `!queuecount`, `!done`)
- Wrap these calls in more complex bots or overlays
- Integrate with other chat systems (Discord, self-hosted bots, etc.)

---

## 7. Extension Ideas

Here are some realistic extensions that illustrate how this architecture can grow:

### 7.1 Dashboard UI

- Create a small web app (Next.js, Svelte, React, etc.)
- Read from the same API (`?queue=1`, `?spot=...`, etc.)
- Show:
  - Live queue
  - Session stats
  - Per-user history

### 7.2 Analytics & Logging

- Append every `next_()` call to another Sheet or database
- Compute:
  - Average session duration
  - Peak concurrent queue size
  - Retention-related metrics

### 7.3 Multi-Queue Support

- Use multiple tabs in the same Sheet (or multiple Sheets)
- Add a `queue_id` parameter, e.g.:
  - `?queue=1&line=hostA`
  - `?queue=1&line=hostB`
- Adjust Apps Script to route requests and compute state per queue.

### 7.4 Alternative Backends

You can reimplement the API in:

- Node.js (serverless functions)
- Python (FastAPI, Flask)
- Any HTTP-capable stack

…and keep:

- The Nightbot commands
- The PowerShell script
- The OBS integration

mostly unchanged, as long as the API contract is preserved.

---

## 8. Testing and Validation Strategies

Even though this repo doesn’t include a full automated test suite, a developer building on it should consider:

- **Apps Script Unit Tests:**
  - Write test helpers for parsing Sheet rows
  - Validate computed queue state for small test data sets
- **PowerShell Script Smoke Tests:**
  - Add a dry-run mode that prints intended changes without writing files
  - Log WebSocket events and validate against expected messages
- **End-to-End Manual Tests:**
  - Local dummy Sheet + dummy viewers
  - Mocking Nightbot calls by hitting URLs in a browser

---

## 9. Code Style & Conventions

- **Apps Script (JavaScript-style):**
  - Small helper functions for each piece of logic
  - Short, descriptive names for clarity under pressure
- **PowerShell:**
  - Config section at the top
  - Structured steps (fetch → parse → write files → notify OBS)
- **Documentation:**
  - README as a narrative entry point
  - `docs/` folder for deeper dives
  - Inline comments where operational details matter

This project is intentionally engineered to be both **practical for real streamers** and **credible as an architectural artifact** for technical evaluation.
