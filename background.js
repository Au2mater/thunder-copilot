// background.js
// Minimal background to receive messages from sidebar and do heavy-lifting.

console.log('Copilot background script loaded');

// message handler from sidebar/options
browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === 'getDisplayedMessage') {
    // messageDisplay.getDisplayedMessages -> returns list of messages currently shown
    const displayed = await browser.messageDisplay.getDisplayedMessages();
    if (displayed && displayed.messages && displayed.messages.length) {
      const header = displayed.messages[0];
      const full = await browser.messages.get(header.id);
      return Promise.resolve({ ok: true, message: full });
    }
    return Promise.resolve({ ok: false, error: 'no message displayed' });
  }

  if (msg.type === 'searchMessages') {
    // Example search: {query: {subjectContains: "meeting"}}
    try {
      const result = await browser.messages.query(msg.query);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'createDraft') {
    // create a compose window prefilled and save it as a draft
    try {
      const composeTab = await browser.compose.beginNew(null, {
        subject: msg.subject || '',
        body: msg.body || '',
        to: msg.to || []
      });
      // wait a tick then save
      await browser.compose.saveMessage(composeTab.id, { mode: 'draft' });
      return { ok: true, composeTabId: composeTab.id };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'generateICS') {
    // msg.events: array of event objects -> returns a blob URL
    const ics = eventsToICS(msg.events);
    // create object URL so sidebar can download/import
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    return { ok: true, url, ics };
  }

  return null;
});

function eventsToICS(events) {
  // Very small ICS generator: events = [{uid, start, end, summary, description, location}]
  // start/end are ISO strings (UTC or local). This is minimal — expand for full RFC5545 support.
  function toICSDate(dt) {
    // returns YYYYMMDDTHHMMSSZ if dt ends with Z or convert local as naive
    const d = new Date(dt);
    const pad = n => n.toString().padStart(2, '0');
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  let out = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Copilot//TB\r\nCALSCALE:GREGORIAN\r\n';
  for (const ev of events) {
    out += 'BEGIN:VEVENT\r\n';
    out += `UID:${ev.uid || (Date.now() + Math.random()).toString(36)}\r\n`;
    out += `DTSTAMP:${toICSDate(new Date().toISOString())}\r\n`;
    if (ev.start) out += `DTSTART:${toICSDate(ev.start)}\r\n`;
    if (ev.end) out += `DTEND:${toICSDate(ev.end)}\r\n`;
    out += `SUMMARY:${escapeICSText(ev.summary || '')}\r\n`;
    if (ev.location) out += `LOCATION:${escapeICSText(ev.location)}\r\n`;
    if (ev.description) out += `DESCRIPTION:${escapeICSText(ev.description)}\r\n`;
    out += 'END:VEVENT\r\n';
  }
  out += 'END:VCALENDAR\r\n';
  return out;
}

function escapeICSText(s) {
  return (s || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}