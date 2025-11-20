/***** CONFIG *****/
const SHEET_ID   = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';   // e.g., 1qxM...d8exo
const SHEET_NAME = 'Form Responses 1';                   // exact tab name
const UP_NEXT_N  = 4;                                    // names to show "up next"

/***** Helpers *****/
const SP = PropertiesService.getScriptProperties();

function sheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (!sh) throw new Error('No sheet found.');
  return sh;
}

function headers_(values) {
  const hdr = values[0].map(v => String(v || '').trim());
  const findCol = (re, fallbackIdx = -1) => {
    const i = hdr.findIndex(h => re.test(h));
    return i >= 0 ? i : fallbackIdx;
  };
  return {
    nameIdx:  findCol(/name|call\s*you/i, 0),
    phoneIdx: findCol(/(sms|phone|mobile)/i, -1),
  };
}

function safeInt_(v, dflt = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}

function nowMs_() { return Date.now(); }

function fmtList_(arr) {
  return arr.filter(x => x && String(x).trim() !== '').join(', ');
}

/***** Core state *****/
function loadState_() {
  const sh   = sheet();
  const data = sh.getDataRange().getValues();
  if (!data || data.length < 2) {
    return { data, hdr: {nameIdx:0, phoneIdx:-1}, idx:1, now:'', upNext:[], count:0, avgMs:0 };
  }
  const hdr  = headers_(data);
  let idx    = safeInt_(SP.getProperty('IDX'), 1);
  let count  = safeInt_(SP.getProperty('COUNT'), 0);
  let sumMs  = safeInt_(SP.getProperty('AVG_SUM_MS'), 0);
  let nMs    = safeInt_(SP.getProperty('AVG_N'), 0);

  if (idx < 1) idx = 1;
  if (idx >= data.length) idx = data.length - 1;

  const nameAt = r => String((data[r] && data[r][hdr.nameIdx]) || '').trim();

  const now = nameAt(idx);
  const upNext = [];
  for (let i = 1; i <= UP_NEXT_N; i++) {
    const r = idx + i;
    if (r < data.length) upNext.push(nameAt(r));
  }

  const avgMs = nMs > 0 ? Math.round(sumMs / nMs) : 0;

  return { data, hdr, idx, now, upNext, count, avgMs };
}

function saveCounters_({ idx, count, sumMs, nMs }) {
  if (idx   != null) SP.setProperty('IDX', String(idx));
  if (count != null) SP.setProperty('COUNT', String(count));
  if (sumMs != null) SP.setProperty('AVG_SUM_MS', String(sumMs));
  if (nMs   != null) SP.setProperty('AVG_N', String(nMs));
}

/***** Operations *****/
function advance_() {
  const lastTs = safeInt_(SP.getProperty('LAST_TS'), 0);
  const now    = nowMs_();
  let sumMs    = safeInt_(SP.getProperty('AVG_SUM_MS'), 0);
  let nMs      = safeInt_(SP.getProperty('AVG_N'), 0);
  if (lastTs > 0 && now > lastTs) {
    sumMs += (now - lastTs);
    nMs   += 1;
  }
  SP.setProperty('LAST_TS', String(now));

  const idx   = safeInt_(SP.getProperty('IDX'), 1) + 1;
  const count = safeInt_(SP.getProperty('COUNT'), 0) + 1;

  saveCounters_({ idx, count, sumMs, nMs });
  return loadState_();
}

function reset_(p) {
  const start = p.startRow ? Math.max(1, parseInt(p.startRow, 10) - 1) : 1;
  saveCounters_({ idx: start, count: 0, sumMs: 0, nMs: 0 });
  SP.deleteProperty('LAST_TS');
  return loadState_();
}

function resetAvg_() {
  saveCounters_({ sumMs: 0, nMs: 0 });
  return loadState_();
}

/***** Responses *****/
function textQueue_(st) {
  const up = fmtList_(st.upNext);
  const avgMin = Math.round((st.avgMs || 0) / 60000);
  return `NOW: ${st.now || '…'} | Up next: ${up || '…'} | Count: ${st.count} | Avg: ${avgMin} min`;
}

function spot_(st, q) {
  const last4 = String((q || '').replace(/\D/g, '')).slice(-4);
  if (!last4) return 'Send the last 4 of your phone after !spot (e.g., !spot 1234).';

  if (st.hdr.phoneIdx < 0) return 'No phone column detected in the sheet.';
  const phoneAt = r => String((st.data[r] && st.data[r][st.hdr.phoneIdx]) || '');
  const dig4 = s => s.replace(/\D/g, '').slice(-4);

  let target = -1;
  for (let r = 1; r < st.data.length; r++) {
    if (dig4(phoneAt(r)) === last4) { target = r; break; }
  }
  if (target < 0) return `Not seeing that number on the list.`;

  const pos     = Math.max(1, target - st.idx + 1);
  const ahead   = Math.max(0, pos - 1);
  const etaMin  = Math.round(((st.avgMs || 0) * ahead) / 60000);

  const userNext = [];
  const nameAt = r => String((st.data[r] && st.data[r][st.hdr.nameIdx]) || '').trim();
  for (let i = 1; i <= Math.min(UP_NEXT_N, 3); i++) {
    const r = target + i;
    if (r < st.data.length) userNext.push(nameAt(r));
  }

  const preview = userNext.length ? ` Up next: ${fmtList_(userNext)}` : '';
  return `You’re #${pos} (${ahead} ahead). ETA ~${etaMin} min.${preview}`;
}

/***** Router *****/
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  let st;

  try {
    if (p.reset === 'true')           st = reset_(p);
    else if (p.resetAvg === '1')      st = resetAvg_();
    else if (p.next === 'true')       st = advance_();
    else                              st = loadState_();

    if (p.json === '1') {
      return ContentService.createTextOutput(JSON.stringify({
        now: st.now,
        upNext: st.upNext.join('\\n'),
        upNextArray: st.upNext,
        count: st.count,
        avgMs: st.avgMs,
        etaNewMinutes: Math.round((st.avgMs || 0) / 60000),
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (p.queue === 'true') {
      return ContentService.createTextOutput(textQueue_(st))
        .setMimeType(ContentService.MimeType.TEXT);
    }
    if (p.spot != null) {
      return ContentService.createTextOutput(spot_(st, p.spot))
        .setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput(textQueue_(st))
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    const msg = (p.json === '1')
      ? JSON.stringify({ error: String(err) })
      : 'Service error. Try again in a moment.';
    return ContentService.createTextOutput(msg)
      .setMimeType((p.json === '1') ? ContentService.MimeType.JSON
                                    : ContentService.MimeType.TEXT);
  }
}
