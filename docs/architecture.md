# Architecture Overview — Live Stream Queue Automation System

This document explains **how all the pieces fit together**, from the viewer typing `!queue` in chat to your overlays updating in OBS.

It is written for:

- **Streamers** who want to understand the big picture
- **Developers** who want to extend or integrate the system
- **Reviewers** who want to quickly see the architectural thinking behind this project

---

## 1. High-Level Flow

At a high level, the the system connects:

1. **Viewers and chat** (Twitch / YouTube / etc.)
2. **Nightbot**, which forwards specific commands to a web API
3. **Google Apps Script**, which reads the queue from **Google Sheets** and returns structured responses
4. **PowerShell**, which calls the API and updates text files
5. **OBS**, which reads those text files into **text sources** and shows them on stream
6. (Optional) **Stream Deck**, which triggers the PowerShell script with a single button

The result: a **continuous live loop** where the queue state drives both chat responses and on-screen graphics.

---

## 2. Detailed Data Flow

### 2.1 Viewer → Chat → Nightbot

1. A viewer types a command in chat, for example:

   ```text
   !queue
   !wait
   !spot 1234
   ```

2. Nightbot has custom commands defined using `$(urlfetch ...)` that call the web app URL deployed from `apps_script/Code.gs`.

   Example Nightbot command:

   ```text
   $(urlfetch https://YOUR_WEB_APP_URL/exec?queue=1)
   ```

3. Nightbot receives the plain-text response from the web app and prints it back into chat.

---

### 2.2 Nightbot → Apps Script → Google Sheets

The Google Apps Script (in `apps_script/Code.gs`) acts like a **tiny HTTP API**:

- It receives GET requests such as:
  - `?queue=1`
  - `?spot=1234`
  - `?wait=1`
  - `?next=1`
- It reads the configured Google Sheet using:
  - `SHEET_ID`
  - `SHEET_NAME`
- It calculates:
  - Who is active now
  - Who is up next
  - How many total sessions have been completed
  - Estimated wait time based on historical averages
- It returns **human-readable** text (for chat) and structured data (for overlays) depending on the endpoint.

This is the **source of truth** for the queue state.

---

### 2.3 Apps Script → PowerShell → Overlay Files

While chat responses are directed back to Nightbot, some endpoints are used by the **PowerShell script** in `powershell/update_overlays.ps1`.

For example, when you press your “Next Session” button (which runs `nextSession.bat`), PowerShell:

1. Calls the Apps Script web app with `?next=1` to advance the queue.
2. Receives updated information for:
   - The **current participant**
   - The **up next** list
   - The **total session count**
3. Writes this information into text files in the `overlays/` directory:
   - `overlays/now_active.txt`
   - `overlays/up_next.txt`
   - `overlays/session_count.txt`
4. Connects to OBS via WebSocket and:
   - Temporarily hides a framing element (e.g. `"Frame"`)
   - Shows the group `"First Timer Toast!"` if the current participant is a first-timer
   - Restores visibility when the toast completes

This allows you to keep **all visual state** in sync with the queue with one script call.

---

### 2.4 Overlay Files → OBS → Viewers

In OBS, you configure **Text Sources** to read the content of the text files:

- `now_active.txt` → “Now Active” label
- `up_next.txt` → “Up Next” strip
- `session_count.txt` → “Total Sessions” or “Total Calls”

OBS monitors those files and automatically updates the text sources when they change.

Viewers see:

- Exactly who is being worked with now
- Who is about to be on deck
- How far along you are in your event

---

## 3. ASCII Architecture Diagram

```text
                          Viewers
                   (Twitch / YouTube / etc.)
                               |
                     !queue / !spot / !wait
                               |
                               v
                            Nightbot
                  (urlfetch → Apps Script URL)
                               |
                               v
                   Google Apps Script Web App
                 ┌─────────────────────────────┐
                 │ Reads queue from Sheet      │
                 │ Computes positions & ETAs   │
                 │ Endpoints:                  │
                 │   ?queue=1                  │
                 │   ?spot=1234                │
                 │   ?wait=1                   │
                 │   ?next=1                   │
                 └───────────┬─────────────────┘
                             |
        ┌────────────────────┴────────────────────────┐
        |                                             |
        v                                             v
  Nightbot prints                            PowerShell Script
  text into chat                           update_overlays.ps1
                                                      |
                                                      | writes overlay text files
                                                      v
                                          overlays/now_active.txt
                                          overlays/up_next.txt
                                          overlays/session_count.txt
                                                      |
                                                      v
                                               OBS Text Sources
                                                      |
                                                      v
                                                  Live Stream
```

---

## 4. Components Overview

### 4.1 `apps_script/Code.gs`

- Contains:
  - Configuration (`SHEET_ID`, `SHEET_NAME`, `UP_NEXT_N`)
  - Helper functions to parse rows from the Sheet
  - HTTP handler (`doGet`) that routes to:
    - `queue_()`
    - `spot_(token)`
    - `next_()`
- Responsibilities:
  - Maintain queue order (using a pointer or index)
  - Compute metrics like average session duration
  - Generate human-readable messages for chat
  - Return overlay-friendly state to PowerShell

### 4.2 `powershell/update_overlays.ps1`

- Calls the web app (`$BaseUrl`) with query parameters
- Parses responses
- Writes overlay files
- Uses OBS WebSocket v5 for:
  - Showing/hiding a “First Timer Toast!” group
  - Hiding/unhiding the `"Frame"` element

### 4.3 `nightbot/commands.md`

- Provides ready-to-paste commands for:
  - `!queue`
  - `!wait`
  - `!spot`
- Each command uses `$(urlfetch ...)` to call the web app.

### 4.4 `obs/SETUP.md`

- Guides you through:
  - Installing and configuring obs-websocket v5
  - Creating the text sources
  - Creating the “First Timer Toast!” group
  - Ensuring names match what `update_overlays.ps1` expects

---

## 5. Design Principles

- **No external server**  
  Everything runs on free, widely available tools: Google Apps Script, Sheets, OBS, PowerShell, Nightbot.

- **Simple primitives**  
  HTTP requests, text files, and WebSocket messages are the basic building blocks.

- **Modularity**  
  Each subsystem (chat, API, overlays, input form) can be replaced or extended independently.

- **Operational robustness**  
  The system is designed around long-running, live-event usage, where reliability matters more than complexity.

---

## 6. Extending the Architecture

Some possible extensions:

- Add a dashboard (web UI) that reads from the same API
- Log events to another Sheet or external database
- Create multiple queues for multiple hosts
- Add richer audience messaging (DMs, emails, SMS)
- Integrate additional bots (e.g., custom bots, other platforms)

The current architecture is intentionally straightforward, so these extensions can be tackled incrementally.
