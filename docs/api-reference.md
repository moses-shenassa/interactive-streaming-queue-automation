# API Reference — Live Stream Queue Automation System

This document describes the **HTTP interface** exposed by the Google Apps Script web app (`apps_script/Code.gs`).

All endpoints are accessed via **HTTP GET**.

Base URL (example):

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

In the examples below, we will refer to:

```text
BASE_URL = https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

---

## 1. Common Concepts

### 1.1 Identifiers

Some endpoints accept identifiers that help locate a viewer in the queue:

- **Spot token**: typically the last 4 digits of a contact value (e.g., phone number)
- **Row index or internal pointer**: stored within the Sheet and managed by the script

The exact representation may be customized, but the default provided expects a `spot` parameter that can uniquely match an entry via its contact information.

### 1.2 Response Format

By default, the API returns **plain text** messages designed to be printed directly into chat by Nightbot.

Developers can:

- Extend the script to emit JSON
- Add an alternate mode (e.g., `?format=json`) for machine-readable responses

---

## 2. Endpoints

### 2.1 `GET /exec?queue=1`

**Purpose:**  
Return a human-readable summary of the current queue.

**Example:**

```text
GET {BASE_URL}?queue=1
```

**Typical response (plain text):**

```text
Now working with: Alice (ticket 1042). Up next: Bob, Carla, Devin. Approximate wait: 25–30 minutes. Total sessions completed: 13.
```

**Intended use:**

- Nightbot command:
  - `!queue`
  - `!wait`
- Chat bots, dashboards, or logs that want a user-friendly status line.

---

### 2.2 `GET /exec?wait=1`

**Purpose:**  
Alias or variant of `queue=1`, focused specifically on estimated wait times.

**Example:**

```text
GET {BASE_URL}?wait=1
```

**Typical response:**

```text
Current estimated wait is around 20–25 minutes based on the last 10 sessions.
```

**Intended use:**

- Dedicated `!wait` command
- UI components that show a wait-time banner

---

### 2.3 `GET /exec?spot=TOKEN`

**Purpose:**  
Return a message targeted at a **specific viewer**, based on a token (e.g., last 4 digits of a phone number).

**Example:**

```text
GET {BASE_URL}?spot=1234
```

**Typical response:**

```text
We found you! Your spot is #7 in the queue. Approximate wait: 35–40 minutes.
```

**Intended use:**

- Nightbot `!spot` command:
  ```text
  !spot → $(urlfetch {BASE_URL}?spot=$(query))
  ```
- Personalized tools or DM-based bots

**Error cases:**

```text
We couldn't find anyone with that code. Please double-check your last 4 digits.
```

---

### 2.4 `GET /exec?next=1`

**Purpose:**  
Advance the queue pointer and return updated state.

**Example:**

```text
GET {BASE_URL}?next=1
```

**Typical response:**

```text
Advancing queue. Now working with: Alice (ticket 1042). Up next: Bob, Carla, Devin. Total sessions completed: 14.
```

**Intended use:**

- Called by `powershell/update_overlays.ps1` when:
  - You press the “Next Session” button
  - You want to move to the next participant and refresh overlays

**Notes:**

- Should be designed to be **idempotent or at least safe under occasional duplicate calls**, e.g.:
  - Use simple guards to avoid skipping entries
  - Log transitions if extended

---

## 3. Extension Points

The current API is intentionally minimal. You can extend it with:

### 3.1 JSON Mode

Add a parameter:

```text
?queue=1&format=json
```

…that returns structured data like:

```json
{
  "now_active": "Alice",
  "ticket": "1042",
  "up_next": ["Bob", "Carla", "Devin"],
  "completed_sessions": 13,
  "estimated_wait_minutes": [25, 30]
}
```

This is particularly useful for:

- Custom web dashboards
- Mobile apps
- Bot integrations

---

### 3.2 Admin Operations

You can create admin-only endpoints, for example:

- `?reset=1` — reset the queue pointer
- `?skip=TOKEN` — mark a particular viewer as skipped
- `?insert=TOKEN&position=N` — reorder the queue

These should be protected (e.g., by secret keys or restricted deployments) if used in real environments.

---

### 3.3 Alternate Index Strategies

Currently, the queue may be tracked via:

- A pointer stored in a cell
- An inferred pointer based on:
  - Completed timestamps
  - Status columns

Developers can implement alternate strategies:

- Priority queues based on some scoring logic
- Separate queues per host or channel
- Weighted fairness across different segments of the audience

The API contract (these basic endpoints) can remain stable while internal logic changes.

---

## 4. Versioning and Stability

The system is currently versioned informally by commit and README.  
If you intend to expose this API to external consumers, consider:

- Adding a `version` field to JSON responses
- Naming functions or parameters in a way that supports evolution, e.g.:
  - `?queue_v2=1`
  - `/exec/v1` vs `/exec/v2` (if using another stack)

---

## 5. Summary

This API is deliberately:

- Small  
- Focused  
- Easy to reason about under pressure  

It exists to support:

- Real-time chat feedback (`!queue`, `!wait`, `!spot`)
- Programmatic overlay updating via PowerShell
- Extensible, code-driven enhancements by developers

Use this document as a base reference when you customize or extend `apps_script/Code.gs`.
