# Streamer Setup Guide — Live Stream Queue Automation System

This guide is written for **non-technical streamers**.

If you:

- Know how to open a browser
- Know how to install OBS
- Can follow step-by-step instructions

…you can set this system up.

You do **not** need to be a programmer.

---

## 1. What This System Does (Streamer-Friendly)

This system helps you:

- Collect viewer requests with a **Google Form**
- Turn those responses into a **queue** in a Google Sheet
- Let viewers ask:
  - `!queue` — “How long is the line?”
  - `!wait` — “What’s the wait looking like?”
  - `!spot 1234` — “Where am I in the queue?”
- Show:
  - **Now Active** on screen
  - **Up Next** list
  - **Session count** (how many you’ve done)
- Advance everything with **one button**, so you can stay focused on the show.

---

## 2. Tools You’ll Need

You’ll need:

1. A **Google account**  
2. **OBS** (free software for streaming)  
3. **Nightbot** linked to your Twitch / YouTube  
4. **PowerShell** (already built into Windows)  
5. (Optional) **Stream Deck** or any way to run a `.bat` file with one button

---

## 3. Create Your Viewer Form

1. Go to **Google Forms**.
2. Create a new form.
3. Add questions like:
   - “Name”
   - “Contact (email or phone)”
   - “Your question or request”
4. Click **Responses → Link to Sheets** to create the Google Sheet.

You now have:

- A **Form** people fill out
- A **Sheet** where all responses are stored

---

## 4. Install the Apps Script (The “Brain”)

1. Open the Google Sheet that stores your form responses.
2. Click **Extensions → Apps Script**.
3. Delete any code that’s there.
4. Open the file `apps_script/Code.gs` from this project.
5. Copy everything and paste it into Apps Script.
6. At the top of the file, find:

   ```js
   const SHEET_ID   = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
   const SHEET_NAME = 'Form Responses 1';
   const UP_NEXT_N  = 4;
   ```

7. Replace:
   - `SHEET_ID` with your actual Sheet ID (the long ID in the URL).
   - `SHEET_NAME` with the name of your tab (default is `Form Responses 1`).
8. Click the save icon.

### Deploy the Web App

1. In Apps Script, click **Deploy → New deployment**.
2. Click **Select type → Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Copy the **Web app URL**.  
   It will look something like:

   ```text
   https://script.google.com/macros/s/long-id-here/exec
   ```

This is your **magic URL**. Keep it handy.

---

## 5. Add Nightbot Commands

1. Go to the `nightbot/commands.md` file in this project.
2. Open it and find the commands for:
   - `!queue`
   - `!wait`
   - `!spot`
3. For each command:
   - Copy the entire line into Nightbot’s **Custom Commands** section.
   - Replace `YOUR_WEB_APP_URL` with your magic URL.

Now your viewers can type:

- `!queue`
- `!wait`
- `!spot 1234`

…and get answers instantly.

---

## 6. Set Up OBS Overlays

This is where your stream visuals come from.

1. In your project folder, make sure there is an `overlays/` directory.
2. Inside OBS:
   - Create a **Text (GDI+)** or similar source.
   - Check the option to **read text from file**.
   - Point it to:
     - `overlays/now_active.txt`
   - Name the source something like `Now Active`.

Repeat for:

- `overlays/up_next.txt` → source `Up Next`
- `overlays/session_count.txt` → source `Session Count`

### First Timer Toast

1. Create a **Group** named **First Timer Toast!**.
2. Put your animated frame, text, or image inside this group.
3. This group will be shown briefly for first-time participants when the script runs.

Make sure:

- The scene with these sources is your **program** (live) scene.
- The names in OBS match what’s expected in `powershell/update_overlays.ps1`.

More details are in `obs/SETUP.md`.

---

## 7. Set Up the PowerShell Script

1. Open the file `powershell/update_overlays.ps1` in a text editor (VS Code, Notepad++, etc.).
2. At the top, find configuration like:

   ```powershell
   $BaseUrl = 'https://YOUR_WEB_APP_URL/exec'

   $ObsWsUrl        = 'ws://127.0.0.1:4455'
   $ObsPassword     = 'CHANGE_ME'
   $ToastGroupName  = 'First Timer Toast!'
   $FrameItemName   = 'Frame'
   ```

3. Update:
   - `$BaseUrl` → your magic URL (ending with `/exec`)
   - `$ObsPassword` → the password you set in OBS WebSocket
4. Save the file.

---

## 8. Test the Script

1. Right-click on `nextSession.bat`.
2. Choose **Run** (or double-click it).
3. If everything is configured correctly:
   - The script will advance the queue.
   - The `overlays/*.txt` files will change.
   - OBS text will update.
   - The first-timer toast will fire if the new participant is a first-timer.

---

## 9. Stream Deck (Optional)

To trigger `nextSession.bat` from the Stream Deck:

1. Open the Stream Deck software.
2. Drag an **Open** or **Run** action onto a button.
3. Point it to `nextSession.bat`.
4. Name the button “Next Session”.

Now, during your stream, every time you finish one interaction:

- Press the button
- Everything updates automatically

---

## 10. Common Issues & Quick Fixes

- **Nothing happens when I run `nextSession.bat`:**
  - Check `powershell/update_overlays.ps1` for typos in `$BaseUrl`.
  - Test the Apps Script URL manually in your browser with `?queue=1`.

- **OBS text doesn’t change:**
  - Double-check the file paths in the text source properties.
  - Make sure the script has permission to write to the `overlays/` folder.

- **Nightbot says “Error fetching URL”:**
  - Verify that the Apps Script deployment is set to “Anyone”.
  - Make sure you didn’t accidentally truncate the URL.

If you work through this guide slowly and carefully, you’ll end up with a **professional-grade** automated queue system ready for real-world streaming events.
