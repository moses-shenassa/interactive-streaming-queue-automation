# Architecture Overview

This document explains how the interactive streaming queue system fits together.

## Components

1. **Google Sheet (Queue Backend)**  
   - Columns: `Timestamp`, `Name`, `Status`, `Question`  
   - Status values:
     - `QUEUED` – waiting in line
     - `ACTIVE` – currently being read
     - `DONE` – completed

2. **Google Apps Script Web App**  
   - Deployed as a web app with public GET access  
   - Exposes endpoints documented in `api-contract.md`  
   - Handles:
     - Nightbot text responses
     - Overlay JSON payloads
     - Queue statistics (including average minutes per person)

3. **Nightbot**  
   - Chat commands such as `!queue`, `!spot`, `!wait`  
   - Each command calls the Apps Script URL and prints a short response to chat.

4. **PowerShell Overlay Updater**  
   - Runs on the streaming machine (or a nearby server)  
   - Polls the Apps Script overlay endpoint on a fixed interval  
   - Writes:
     - `now_servingg.txt`
     - `up_next.txt`
     - `served.txt`
   - Optionally sends OBS WebSocket commands to trigger animations or scene changes.

5. **OBS Studio**  
   - Text sources bound to the overlay `.txt` files  
   - Layout shows:
     - Person currently being served
     - Next person in line
     - How many interactions have been completed / total queue size

## Data Flow

1. Viewer submits a form or command to join the queue.  
2. Queue entry is added to the Google Sheet.  
3. Host or assistant updates the `Status` column as queue progresses.  
4. Nightbot commands query the Apps Script web app, which reads from the Sheet.  
5. The overlay updater script polls the overlay endpoint and updates local text files.  
6. OBS reads the text files and displays them on stream.

This design intentionally uses simple, inspectable technologies (Sheets, text
files, JSON over HTTP) to make debugging and iteration easy.
