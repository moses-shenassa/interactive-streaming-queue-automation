# OBS Setup (WebSocket + Overlays)

1. **obs-websocket v5** (OBS 28+): enable server, set password.
2. Create Text sources that read these files (absolute paths recommended):
   - `overlays/now_active.txt`
   - `overlays/up_next.txt`
   - `overlays/session_count.txt`
3. Create a Group called **First Timer Toast!** that auto-plays your animation/sfx when visible.
4. Ensure a layer called **Frame** exists (to hide during the toast).
5. (Optional) Use Stream Deck to run `nextSession.bat` each time you finish an on-stream interaction (session).
