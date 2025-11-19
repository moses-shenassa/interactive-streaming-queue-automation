/**
 * Interactive Streaming Queue Web App (Sanitized Version)
 *
 * Backed by a Google Sheet with columns:
 * Timestamp | Name | Status | Question
 *
 * Status values:
 *  - "QUEUED"
 *  - "ACTIVE"
 *  - "DONE"
 *
 * Exposes endpoints for:
 *  - Nightbot text responses
 *  - JSON payloads for overlays
 *
 * Deploy as a web app:
 *  - Execute as: Me
 *  - Who has access: Anyone with the link
 */

// TODO: Replace these with your own values.
var SHEET_ID   = 'REPLACE_WITH_SHEET_ID';
var SHEET_NAME = 'Queue';

function doGet(e) {
  var params = e.parameter || {};
  var mode   = (params.mode || 'stats').toLowerCase();
  var format = (params.format || 'text').toLowerCase();

  try {
    if (mode === 'nightbot') {
      return handleNightbot(params);
    } else if (mode === 'overlay') {
      return handleOverlay(params, format);
    } else if (mode === 'stats') {
      return handleStats(format);
    } else {
      return ContentService
        .createTextOutput('Unknown mode. Use mode=nightbot|overlay|stats')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  } catch (err) {
    Logger.log(err);
    if (format === 'json') {
      return jsonResponse({ error: 'Internal error' }, 500);
    }
    return ContentService
      .createTextOutput('Sorry, something went wrong with the queue service.')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Nightbot entry point
 *  mode=nightbot&command=queue|spot|wait
 */
function handleNightbot(params) {
  var command = (params.command || '').toLowerCase();
  var name    = (params.user || '').trim(); // optional, for spot/wait commands

  var data = getQueueData();
  if (!data.entries.length) {
    return textResponse('The queue is currently empty.');
  }

  if (command === 'queue') {
    var active = data.active;
    var queuedCount = data.queued.length;
    if (active) {
      return textResponse(
        'Now serving: ' + active.name +
        ' | ' + queuedCount + ' in the queue.'
      );
    } else {
      return textResponse(queuedCount + ' people are in the queue.');
    }
  }

  if (command === 'spot') {
    if (!name) {
      return textResponse('Please provide your name so I can check your spot.');
    }
    var spotInfo = findViewerSpot(data, name);
    if (!spotInfo) {
      return textResponse('I do not see you in the queue right now.');
    }
    return textResponse(
      'Hey ' + spotInfo.name +
      ', you are #' + spotInfo.position +
      ' in the active queue.'
    );
  }

  if (command === 'wait') {
    if (!name) {
      return textResponse('Please provide your name so I can estimate wait time.');
    }
    var viewer = findViewerSpot(data, name);
    if (!viewer) {
      return textResponse('I do not see you in the queue right now.');
    }
    if (!data.avgMinutesPerSpot) {
      return textResponse(
        'I cannot estimate wait time yet, but you are #' +
        viewer.position + ' in the queue.'
      );
    }
    var etaMinutes = viewer.position * data.avgMinutesPerSpot;
    var etaText = Utilities.formatString('~%d minutes', Math.round(etaMinutes));
    return textResponse(
      'Hey ' + viewer.name +
      ', there are ' + viewer.position +
      ' ahead of you. Estimated wait: ' + etaText + '.'
    );
  }

  return textResponse(
    'Unknown Nightbot command. Use command=queue | command=spot | command=wait.'
  );
}

/**
 * Overlay entry point
 *  mode=overlay&format=text|json
 */
function handleOverlay(params, format) {
  var data = getQueueData();

  var payload = {
    nowServing: data.active ? data.active.name : '',
    upNext: data.queued.length ? data.queued[0].name : '',
    spotsDone: data.done.length,
    totalQueued: data.entries.length
  };

  if (format === 'json') {
    return jsonResponse(payload);
  }

  // Text format with newline separation for simple shell parsing if desired.
  var text =
    'NOW:' + (payload.nowServing || '-') + '\n' +
    'NEXT:' + (payload.upNext || '-') + '\n' +
    'DONE:' + payload.spotsDone + '\n' +
    'TOTAL:' + payload.totalQueued;

  return textResponse(text);
}

/**
 * Stats entry point (JSON by default)
 *  mode=stats&format=text|json
 */
function handleStats(format) {
  var data = getQueueData();
  var payload = {
    activeName: data.active ? data.active.name : null,
    activeSince: data.active ? data.active.timestamp : null,
    queuedCount: data.queued.length,
    doneCount: data.done.length,
    avgMinutesPerSpot: data.avgMinutesPerSpot
  };

  if (format === 'text') {
    var parts = [];
    if (payload.activeName) {
      parts.push('Now serving: ' + payload.activeName);
    }
    parts.push('Queued: ' + payload.queuedCount);
    parts.push('Completed: ' + payload.doneCount);
    if (payload.avgMinutesPerSpot) {
      parts.push(
        'Avg minutes/person: ' +
        payload.avgMinutesPerSpot.toFixed(1)
      );
    }
    return textResponse(parts.join(' | '));
  }

  return jsonResponse(payload);
}

/**
 * Core data loader for the queue.
 */
function getQueueData() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  if (!values.length) {
    return {
      entries: [],
      active: null,
      queued: [],
      done: [],
      avgMinutesPerSpot: null
    };
  }

  var headers = values[0];
  var rows = values.slice(1);

  var idxTimestamp = headers.indexOf('Timestamp');
  var idxName      = headers.indexOf('Name');
  var idxStatus    = headers.indexOf('Status');

  var entries = rows
    .map(function (row) {
      return {
        timestamp: row[idxTimestamp],
        name: String(row[idxName] || '').trim(),
        status: String(row[idxStatus] || '').trim().toUpperCase()
      };
    })
    .filter(function (e) { return e.name; });

  var active = null;
  var queued = [];
  var done   = [];

  entries.forEach(function (e) {
    if (e.status === 'ACTIVE') active = e;
    else if (e.status === 'QUEUED') queued.push(e);
    else if (e.status === 'DONE') done.push(e);
  });

  // Compute simple average minutes per person in queue based on DONE rows.
  var avgMinutes = null;
  if (done.length >= 2) {
    var times = done
      .map(function (e) { return new Date(e.timestamp).getTime(); })
      .sort();
    var diffs = [];
    for (var i = 1; i < times.length; i++) {
      diffs.push((times[i] - times[i - 1]) / 1000 / 60);
    }
    if (diffs.length) {
      avgMinutes = diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length;
    }
  }

  return {
    entries: entries,
    active: active,
    queued: queued,
    done: done,
    avgMinutesPerSpot: avgMinutes
  };
}

/**
 * Find spot in queue for a given viewer name (case-insensitive).
 */
function findViewerSpot(data, rawName) {
  var name = rawName.toLowerCase();
  var list = data.queued.slice(); // queued only

  for (var i = 0; i < list.length; i++) {
    if (list[i].name.toLowerCase() === name) {
      return {
        name: list[i].name,
        position: i + 1
      };
    }
  }
  return null;
}

/**
 * Helpers for responses
 */
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

function jsonResponse(obj, statusCode) {
  var out = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  if (typeof statusCode === 'number') {
    out.setResponseCode(statusCode);
  }
  return out;
}
