# Architecture Overview (Generalized Queue Automation System)

This document describes the architecture of a generalized **Interactive Queue & Service Automation System**, suitable for livestreams, workshops, support queues, gaming events, webinars, or any real-time “take-a-number” flow.

It uses intentionally neutral terms so the system can support any event type:

- **Spots** — positions in line  
- **Now Serving** — person currently being helped  
- **Served Count** — number of people completed  
- **Queue Size** — total people still waiting  
- **Average Minutes per Spot** — pacing metric used for wait-time estimates  

This version includes all rubric improvements and incorporates your updated terminology.

---

## 1. Components

### **1. Google Form (User-Facing Entry Point)**

Participants enter the queue by submitting a Google Form.  
The form typically collects:

- Name or handle  
- Optional description / question / request  
- Timestamp (added automatically)  
- Any metadata needed by the host  

Google Forms automatically pushes all responses into the backend Google Sheet, making onboarding frictionless for participants and easy to manage for organizers.

---

### **2. Google Sheet (Queue Backend)**

The Sheet stores all queue data in a clean, auditable format.

Typical columns:

| Column       | Purpose                                      |
|--------------|----------------------------------------------|
| Timestamp    | Time of form submission                      |
| Name         | Identifier for the participant               |
| Status       | `QUEUED`, `ACTIVE`, `SERVED`                 |
| Metadata     | Optional (description, notes, category)      |

Statuses define the flow of participants:

- **QUEUED**: waiting to be served  
- **ACTIVE**: the person currently being served  
- **SERVED**: completed  

Organizers can manually update statuses or automate updates via keyboard shortcuts, macros, or stream deck integrations.

---

### **3. Google Apps Script Web App (REST API Layer)**

A deployed Google Apps Script acts as the public-facing API.  
It reads the Sheet and outputs structured data for:

- Chatbots (Nightbot)
- Local scripts (PowerShell workers)
- Overlays
- Analytics dashboards

Three main endpoints are provided:

---

#### **A. Nightbot Endpoint**

Provides short, chat-friendly status messages.

**Path:** `/`  
**Query:**  
`mode=nightbot&command=queue|spot|wait&user=Name`

- **queue** → shows now serving + queue size  
- **spot** → reports a user’s position in line  
- **wait** → calculates estimated wait time based on service pacing  

All responses are plain text and optimized for readability in chat.

---

#### **B. Overlay Endpoint**

Used by the streaming computer to update real-time overlays.

**Path:** `/`  
**Query:** `mode=overlay&format=text|json`

**JSON response:**

```json
{
  "nowServing": "Alex",
  "upNext": "Jordan",
  "served": 3,
  "totalQueued": 12
}
```

**Text response (legacy):**

```
NOW:Alex
NEXT:Jordan
SERVED:3
TOTAL:12
```

Supports both JSON (preferred) and plain text depending on downstream needs.

---

#### **C. Stats Endpoint**

Provides pacing and performance analytics.

**Path:** `/`  
**Query:** `mode=stats&format=text|json`

Example JSON output:

```json
{
  "activeName": "Alex",
  "activeSince": "2025-03-01T03:14:00Z",
  "queuedCount": 5,
  "doneCount": 18,
  "avgMinutesPerSpot": 7.4
}
```

These metrics allow:

- Accurate wait-time estimates  
- Monitoring of pacing during long events  
- Historical analysis of participant flow  

---

### **4. PowerShell Overlay Worker**

A PowerShell script runs locally on the streaming computer to:

- Poll the overlay API on a defined interval  
- Write three local text files:
  - `now_serving.txt`
  - `up_next.txt`
  - `served_count.txt`
- Maintain synchronization between the queue and OBS overlay elements  

Optionally, it can send OBS WebSocket commands to:

- Fire animations  
- Toggle overlays  
- Change scenes  

This turns the queue backend into a dynamic visual display for viewers.

---

### **5. OBS Studio (Visualization Layer)**

OBS reads the updated text files as sources.

Typical overlay elements:

- **Now Serving** (primary active participant)
- **Up Next** (next in queue)
- **Served Count** (total number completed)
- Optional event-driven animations (e.g., “First Timer” alerts)

OBS is the final presentation layer, reflecting real-time queue state with zero manual updating required.

---

## 2. Data Flow

The full generalized workflow is:

1. **User submits a Google Form**, which populates a new row in the Sheet.  
(optional) 2. Organizer modifies **Status** values (`QUEUED` → `ACTIVE` → `SERVED`).  
3. **Nightbot** pulls live queue data from the Apps Script API.  
4. **PowerShell** polls the overlay endpoint and writes text files.  
5. **OBS** displays the updated queue information on stream instantly.

This architecture keeps all components loosely coupled, easy to maintain, and resilient to outages or API failures.

---

## 3. Why This Architecture Is Effective

### **✔ Universal**
Works for any event type:
- Livestreams  
- Virtual help desks  
- Q&A sessions  
- Community events  
- “Take a number” systems  

### **✔ Simple & Robust**
Google Forms + Sheets makes entry and auditing trivial.  
Apps Script provides a lightweight API.  
OBS + text files are stable and predictable.

### **✔ Real-Time**
Updates occur continuously with predictable polling intervals.

### **✔ Extensible**
Can be expanded with:
- Priority queues  
- Paid fast-pass spots  
- SMS/email notifications  
- Re-entry for missed spots  
- Multi-host switching  

### **✔ No Vendor Lock-In**
Every component uses open or widely-accessible tools.

---

## 4. Deployment Notes

Before use:

1. Replace `YOUR_SCRIPT_ID` with the deployed Apps Script ID.  
2. Configure Nightbot commands (see `nightbot-commands.md`).  
3. Update PowerShell paths to match your overlay directory.  
4. Add WebSocket credentials if OBS integration is enabled.  

This documentation is sanitized and suitable for public portfolio use.

---

## Version

**Portfolio Edition — v2 (Fully Generalized)**  
