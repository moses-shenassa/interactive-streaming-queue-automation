# Live Stream Queue Automation System  
**A complete, production-quality automation framework for queue-driven livestreams.**  
Designed for streamers. Built for developers.  
Showcase-ready for engineering hiring managers.

---

# ⭐ 1. The Story — From Overwhelm to Elegant Automation

Imagine this:

You’re running a high-energy livestream — coaching, Q&A, reactions, workshops, game help sessions, whatever your community does together.  
Viewers *love* it. Questions flood in. Requests pile up. Everyone is excited.

And then it happens…

- The Google Form is filling faster than you can check it  
- People in chat keep asking “Where am I in the queue?”  
- OBS overlays are out of sync  
- You’re juggling Sheets, switching scenes, copying/pasting responses  
- The momentum of your stream starts to slip

You feel overwhelmed.  
Your audience feels confused.  
Your stream — despite the great content — starts losing flow.

### 🚀 The Turning Point  
What if all of that friction vanished?

What if you could:

- Press one button to advance the queue  
- Automatically update OBS overlays  
- Give viewers perfect, real-time answers to `!queue`, `!wait`, and `!spot`  
- Trigger animations for first-time participants  
- Run a professional, smooth, dynamic stream *without* wrestling spreadsheets?

**That’s exactly what this system does.**

This project converts a messy, high-pressure workflow into a clean, automated, reliable system — all while remaining accessible, flexible, and extensible.

---

# ⭐ 2. Quick Technical Overview (For People Who Want the TL;DR)

**Purpose:**  
A modular automation platform for queue / request-driven livestreams.

**Core components:**

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | Google Sheets + Apps Script | Queue logic + API |
| Chat Layer | Nightbot | Viewer interface |
| Automation | PowerShell | Overlay updates + API calls |
| Visual Layer | OBS + WebSocket v5 | On-screen UI |
| Optional | Stream Deck | One-button queue advancement |

**Highlights:**

- Live, real-time viewer lookup  
- Automatic OBS overlay syncing  
- First-timer toast animation  
- 100% customizable  
- No servers, no hosting, no backend infrastructure  
- Designed for multi-hour, high-volume streams  

**Ideal for:**

- Q&A marathons  
- Coaching or consulting streams  
- Viewer-request streams  
- Charity streamathons  
- Community AMA events  
- Collaborative learning sessions

---

# ⭐ 3. For Streamers — “Explain It Like I’m 11”

This section is intentionally written so even a young beginner can follow it.

If you can follow LEGO instructions, you can install this system.

---

## 🔧 Step 1 — Make the Google Form  
Ask for:

- Name  
- Email or phone  
- Their question / request  

Google automatically creates a Sheet — your queue backend.

---

## 💻 Step 2 — Add the Code to Google Sheets

1. Open your linked Google Sheet  
2. Click **Extensions → Apps Script**  
3. Delete everything  
4. Paste in `apps_script/Code.gs`  
5. At the top of the file, enter your Sheet ID + tab name  
6. Click **Deploy → New deployment → Web app**  
7. Choose:
   - **Execute as:** Me  
   - **Who has access:** Anyone  
8. Copy the link (this is your magic URL)

---

## 🎤 Step 3 — Add the Nightbot Commands  
Open Nightbot → Add command → paste from `nightbot/commands.md`.

Replace:

```
YOUR_WEB_APP_URL
```

…with your magic URL.

Now your chat has:

- `!queue`
- `!wait`
- `!spot 1234`

Nightbot will automatically reply with real-time info.

---

## 🎨 Step 4 — Set Up OBS Overlays  
1. Install **obs-websocket v5**  
2. Make 3 text sources:
   - `now_active.txt`
   - `up_next.txt`
   - `session_count.txt`
3. Create a group named **First Timer Toast!**  
4. Follow all steps in `obs/SETUP.md`

You’re done — your overlays update automatically!

---

## 🟩 Step 5 — Enable the Magic Button  
Double-click `nextSession.bat` to advance the queue.  
Everything updates. Toast fires. OBS syncs. Chat stays correct.

If you have a Stream Deck:

- Add a button
- Choose “Open Program”
- Set it to run `nextSession.bat`

That’s it. Your stream is now **professional-grade**.

---

# ⭐ 4. Installation (For Power Users)

```bash
git clone https://github.com/your-user/live-stream-queue-automation-system.git
cd live-stream-queue-automation-system
```

Inspect folders:

```text
apps_script/
powershell/
obs/
nightbot/
overlays/
nextSession.bat
```

Nothing to install.  
Works anywhere that supports PowerShell + OBS WebSocket.

---

# ⭐ 5. Integration & Usage (Step-by-Step)

## Chat  
Nightbot fetches from:

```
YOUR_WEB_APP_URL?queue=1
YOUR_WEB_APP_URL?spot=$(query)
YOUR_WEB_APP_URL?wait=1
```

## OBS  
OBS text sources read from the `.txt` files PowerShell updates.

## Queue Advancement  

### Basic usage:
```
nextSession.bat
```

### Advanced usage:
```
powershell update_overlays.ps1 -Advance
```

Your stream remains fully synced without any manual work.

---

# ⭐ 6. For Developers — Deep Technical Tour

This section explains the engineering design for builders, integrators, and hiring managers evaluating architectural thinking.

---

## 🧱 Architecture (ASCII Diagram)

```
                       Viewers
                (Twitch / YouTube / FB)
                           |
                 !queue / !spot / !wait
                           |
                           v
                      Nightbot
               (urlfetch → GET endpoints)
                           |
                           v
                 Google Apps Script API
              ┌───────────────────────────────┐
              │ Reads queue from Sheets       │
              │ Computes ETAs / positions     │
              │ Exposes endpoints:            │
              │   ?queue=1                    │
              │   ?spot=1234                  │
              │   ?next=1                     │
              └───────────────┬──────────────┘
                              |
           ┌──────────────────┴────────────────────┐
           |                                       |
           v                                       v
 Nightbot prints                        PowerShell Script
   response to chat                   update_overlays.ps1
                                                |
                                                | writes text files
                                                v
                                 overlays/*.txt → OBS Text Sources
                                                |
                                                v
                                           On‑stream UI
```

---

## 🛠 Tech Stack Details

### Google Apps Script  
- Stateless REST-style API  
- Recomputes positions on each request  
- Safely handles retries and malformed input  

### Google Sheets  
- Canonical data source  
- Human-editable  
- No external database required  

### PowerShell  
- Calls the API  
- Writes overlay files  
- Uses OBS WebSocket v5 for animations & group toggles  

### OBS  
- Reads from 3 text files  
- Hosts the visual components  
- Enables pro-grade automation via WebSocket  

### Stream Deck  
- Optional hardware trigger  
- Fires queue advancement instantly  

---

## 🧩 Engineering Methodology

- **Idempotent operations** (`?next=1` is safe to retry)  
- **No server hosting** needed — Apps Script acts as serverless compute  
- **File-based IPC** for maximum compatibility  
- **Modular design** → easy to extend or replace components  
- **Predictable state transitions** enforced by the Apps Script API  

---

## 🔌 Extension Pathways

Developers can extend the system to:

- Add dashboards (Next.js, React, Svelte)  
- Replace Nightbot with a custom bot  
- Add multi-queue support  
- Add auth or rate limiting  
- Log analytics over time  
- Replace Google Sheets with Airtable / Firebase / SQL  

This repo is purposely built as an extensible foundation.

---

# ⭐ 7. About the Author

Your Name  
Your Links  
Email Address  
Portfolio Website  

*(Fill in your details manually.)*

This project reflects a philosophy:  
**Build tools that keep humans in flow while machines handle the overhead.**

---

# ⭐ 8. License

MIT © 2025

