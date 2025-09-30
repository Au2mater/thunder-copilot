// background.js
// Minimal background to receive messages from sidebar and do heavy-lifting.

// Add-on specific logging system
const TB_COPILOT_LOG_PREFIX = '[TB-Copilot]';

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const logMessage = `${TB_COPILOT_LOG_PREFIX} [${level.toUpperCase()}] ${timestamp}: ${message}`;
  
  switch (level.toLowerCase()) {
    case 'error':
      console.error(logMessage, ...args);
      break;
    case 'warn':
      console.warn(logMessage, ...args);
      break;
    case 'info':
      console.info(logMessage, ...args);
      break;
    case 'debug':
    default:
      console.log(logMessage, ...args);
      break;
  }
}

// Convenience functions
const logger = {
  debug: (msg, ...args) => log('debug', msg, ...args),
  info: (msg, ...args) => log('info', msg, ...args),
  warn: (msg, ...args) => log('warn', msg, ...args),
  error: (msg, ...args) => log('error', msg, ...args)
};

logger.info('Copilot background script loaded');

// message handler from sidebar/options
browser.runtime.onMessage.addListener(async (msg, sender) => {
  logger.debug('Received message:', msg.type);
  
  if (msg.type === 'getDisplayedMessage') {
    try {
      // Get the active tab in the current window
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      logger.debug('Active tabs found:', tabs.length);
      
      if (!tabs || tabs.length === 0) {
        logger.warn('No active tabs found');
        return { ok: false, error: 'No active tab found' };
      }
      
      const activeTab = tabs[0];
      logger.debug('Active tab ID:', activeTab.id, 'Type:', activeTab.type);
      
      // Get the message displayed in the active tab
      const message = await browser.messageDisplay.getDisplayedMessage(activeTab.id);
      
      if (!message) {
        logger.warn('No message displayed in active tab');
        return { ok: false, error: 'No message currently displayed' };
      }
      
      logger.info('Successfully retrieved displayed message:', message.subject);
      
      // Get the full message with body content
      const full = await browser.messages.getFull(message.id);
      
      // Merge the header info with full message data
      const completeMessage = {
        ...message,
        parts: full.parts
      };
      
      return { ok: true, message: completeMessage };
      
    } catch (error) {
      logger.error('Error getting displayed message:', error);
      return { ok: false, error: `Failed to get displayed message: ${error.message}` };
    }
  }

  if (msg.type === 'searchMessages') {
    // Example search: {query: {subjectContains: "meeting"}}
    try {
      logger.debug('Searching messages with query:', msg.query);
      const result = await browser.messages.query(msg.query);
      logger.info('Search completed, found messages:', result.messages?.length || 0);
      return { ok: true, result };
    } catch (err) {
      logger.error('Error searching messages:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'getContacts') {
    // Get contacts from address books for AI context
    try {
      logger.debug('Retrieving contacts from address books');
      
      const addressBooks = await browser.addressBooks.list();
      let allContacts = [];
      
      for (const addressBook of addressBooks) {
        try {
          const contacts = await browser.contacts.list(addressBook.id);
          allContacts = allContacts.concat(contacts.map(contact => ({
            id: contact.id,
            name: contact.properties.DisplayName || contact.properties.FirstName + ' ' + contact.properties.LastName || 'Unknown',
            email: contact.properties.PrimaryEmail || contact.properties.SecondEmail || '',
            addressBookName: addressBook.name
          })).filter(contact => contact.email)); // Only include contacts with email addresses
        } catch (bookError) {
          logger.warn('Error reading contacts from address book:', addressBook.name, bookError);
        }
      }
      
      logger.info('Retrieved contacts:', allContacts.length);
      return { ok: true, contacts: allContacts };
    } catch (err) {
      logger.error('Error getting contacts:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'getMessageContent') {
    // Get full content of a specific message
    try {
      logger.debug('Getting message content for ID:', msg.messageId);
      
      const fullMessage = await browser.messages.getFull(msg.messageId);
      let body = '';
      
      // Extract body content from message parts
      if (fullMessage.parts) {
        body = fullMessage.parts.map(part => part.body || '').join('\n');
      }
      
      logger.info('Retrieved message content, body length:', body.length);
      return { ok: true, body: body };
    } catch (err) {
      logger.error('Error getting message content:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'getSelectedEmails') {
    // Get currently selected emails in Thunderbird
    try {
      logger.debug('Getting selected emails');
      
      // Get the active mail tab
      const mailTabs = await browser.mailTabs.query({ active: true, currentWindow: true });
      
      if (!mailTabs || mailTabs.length === 0) {
        logger.warn('No active mail tab found');
        return { ok: false, error: 'No active mail tab found' };
      }
      
      const mailTab = mailTabs[0];
      logger.debug('Active mail tab ID:', mailTab.tabId);
      
      // Get selected messages
      const selectedMessages = await browser.mailTabs.getSelectedMessages(mailTab.tabId);
      
      if (!selectedMessages || !selectedMessages.messages || selectedMessages.messages.length === 0) {
        logger.info('No messages selected');
        return { ok: true, messages: [] };
      }
      
      logger.info('Found selected messages:', selectedMessages.messages.length);
      
      // Return the selected messages
      return { 
        ok: true, 
        messages: selectedMessages.messages.map(msg => ({
          id: msg.id,
          subject: msg.subject || '(No Subject)',
          author: msg.author || 'Unknown',
          date: msg.date,
          folder: msg.folder
        }))
      };
    } catch (err) {
      logger.error('Error getting selected emails:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'createDraft') {
    // create a compose window prefilled and save it as a draft
    try {
      logger.debug('Creating draft with subject:', msg.subject);
      
      // Create compose details object
      const composeDetails = {};
      
      if (msg.subject) {
        composeDetails.subject = msg.subject;
      }
      
      if (msg.body) {
        composeDetails.body = msg.body;
      }
      
      if (msg.to && Array.isArray(msg.to) && msg.to.length > 0) {
        composeDetails.to = msg.to;
      }
      
      // Begin new compose window
      const composeTab = await browser.compose.beginNew(null, composeDetails);
      
      // Small delay to ensure compose window is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save as draft
      await browser.compose.saveMessage(composeTab.id, { mode: 'draft' });
      
      logger.info('Draft created successfully, composeTabId:', composeTab.id);
      return { ok: true, composeTabId: composeTab.id };
    } catch (err) {
      logger.error('Error creating draft:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'generateICS') {
    // msg.events: array of event objects -> returns a blob URL
    try {
      logger.debug('Generating ICS for events:', msg.events?.length || 0);
      const ics = eventsToICS(msg.events);
      // create object URL so sidebar can download/import
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      logger.info('ICS generated successfully');
      return { ok: true, url, ics };
    } catch (err) {
      logger.error('Error generating ICS:', err);
      return { ok: false, error: String(err) };
    }
  }

  logger.warn('Unknown message type received:', msg.type);
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