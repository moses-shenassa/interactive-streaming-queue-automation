# Documentation Index — Live Stream Queue Automation System

Welcome to the internal documentation set for the **Live Stream Queue Automation System**.

This folder exists to give both streamers and developers a deeper look at how the project works beyond the main `README.md`.

---

## Documents

### 1. `architecture.md`

A complete architectural overview of the system, including:

- High-level data flow
- Component responsibilities
- ASCII architecture diagram
- Notes on design principles and extension options

Start here if you want to understand **how everything fits together**.

---

### 2. `streamer-setup-guide.md`

A detailed, step-by-step guide for **non-technical streamers**.

Covers:

- Creating the Google Form and Sheet
- Installing and configuring the Apps Script
- Adding Nightbot commands
- Setting up OBS overlays
- Configuring the PowerShell script
- Optional Stream Deck integration

Written so even an 11-year-old with patience and curiosity could follow it.

---

### 3. `developer-guide.md`

A deeper technical walkthrough for developers.

Includes:

- Repository layout and rationale
- Apps Script design and routing logic
- PowerShell behavior and OBS WebSocket integration
- Nightbot integration details
- Extension ideas (dashboards, analytics, multi-queue, etc.)
- Testing and validation strategies

Start here if you are evaluating or extending this system as a developer.

---

### 4. `api-reference.md`

Formal documentation of the HTTP API exposed by the Apps Script web app.

Includes:

- Endpoint list:
  - `?queue=1`
  - `?wait=1`
  - `?spot=TOKEN`
  - `?next=1`
- Example requests and responses
- Extension options for JSON mode, admin operations, and alternate indexing
- Notes on versioning and stability

Useful for anyone building custom clients, bots, dashboards, or external services.

---

## How These Docs Relate to `README.md`

- `README.md` is the **story-driven, top-level overview** and onboarding document.
- The files in `/docs` are **deep dives** for:
  - Streamers who want extra guidance
  - Developers who want more detail
  - Reviewers who care about architectural robustness

Together, they present this project as:

- Practical for real streams  
- Understandable for non-technical users  
- Respect-worthy as an engineering artifact in a professional portfolio  
