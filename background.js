// Open main chat window when browser action is clicked
browser.browserAction.onClicked.addListener(async () => {
  // First capture the context
  let contextParams = '';
  
  try {
    // Get current email if available
    const currentEmail = await getCapturedCurrentEmail();
    if (currentEmail) {
      contextParams += `&currentEmail=${encodeURIComponent(JSON.stringify(currentEmail))}`;
    }
    
    // Get selected emails if available - only from active tabs
    const selectedEmails = await getCapturedSelectedEmails(true); // true = active tabs only
    if (selectedEmails && selectedEmails.length > 0) {
      contextParams += `&selectedEmails=${encodeURIComponent(JSON.stringify(selectedEmails))}`;
    }
  } catch (error) {
    console.error("Error capturing context:", error);
  }
  
  // Now open the window with context as URL parameters
  const url = browser.runtime.getURL(`index.html?standalone=1${contextParams}`);
  browser.windows.create({ url, type: 'popup', width: 600, height: 700 });
});
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

// Helper functions to get context for standalone windows
async function getCapturedCurrentEmail() {
  try {
    // First check if we're in a standalone window or the main window
    const currentWindow = await browser.windows.getCurrent();
    let tabs;
    
    // If we're in a popup/standalone window, we need to look for active tabs across all windows
    if (currentWindow.type === 'popup') {
      logger.debug('In standalone window, checking all windows for displayed messages');
      
      // Get all windows
      const allWindows = await browser.windows.getAll();
      const normalWindows = allWindows.filter(win => win.type === 'normal');
      
      // Find focused window if any
      const focusedWindow = normalWindows.find(win => win.focused);
      
      if (focusedWindow) {
        // If there's a focused window, check its active tab first
        tabs = await browser.tabs.query({ active: true, windowId: focusedWindow.id });
        logger.debug('Checking focused window first:', focusedWindow.id, 'tabs:', tabs.length);
      } else {
        // Otherwise check active tabs in all normal windows
        tabs = [];
        for (const win of normalWindows) {
          const windowTabs = await browser.tabs.query({ active: true, windowId: win.id });
          tabs.push(...windowTabs);
        }
        logger.debug('Checking active tabs across all windows, found:', tabs.length);
      }
    } else {
      // Regular case - just check the current window
      tabs = await browser.tabs.query({ active: true, currentWindow: true });
      logger.debug('In normal window, checking active tabs:', tabs.length);
    }
    
    if (!tabs || tabs.length === 0) {
      logger.warn('No active tabs found');
      return null;
    }
    
    // Try to find a message in any of these tabs - prioritize messageDisplay tabs
    
    // First check messageDisplay tabs
    let messageDisplayTabs = tabs.filter(t => t.type === 'messageDisplay');
    for (const tab of messageDisplayTabs) {
      try {
        logger.debug('Checking messageDisplay tab for displayed message:', tab.id);
        const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
        if (message) {
          logger.info('Captured current email from messageDisplay tab:', message.subject);
          return {
            id: message.id,
            subject: message.subject,
            author: message.author,
            date: message.date
          };
        }
      } catch (tabError) {
        logger.warn('Error checking messageDisplay tab', tab.id, ':', tabError);
      }
    }
    
    // Then check mail tabs
    let mailTabs = tabs.filter(t => t.type === 'mail');
    for (const tab of mailTabs) {
      try {
        logger.debug('Checking mail tab for displayed message:', tab.id);
        const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
        if (message) {
          logger.info('Captured current email from mail tab:', message.subject);
          return {
            id: message.id,
            subject: message.subject,
            author: message.author,
            date: message.date
          };
        }
      } catch (tabError) {
        logger.warn('Error checking mail tab', tab.id, ':', tabError);
      }
    }
    
    // Check any other tab types as a last resort
    let otherTabs = tabs.filter(t => t.type !== 'messageDisplay' && t.type !== 'mail');
    for (const tab of otherTabs) {
      try {
        logger.debug('Checking other tab type for displayed message:', tab.id, 'type:', tab.type);
        const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
        if (message) {
          logger.info('Captured current email from other tab type:', message.subject);
          return {
            id: message.id,
            subject: message.subject,
            author: message.author,
            date: message.date
          };
        }
      } catch (tabError) {
        // This is expected for many tab types, so only log in debug
        logger.debug('Error or no message in tab', tab.id, ':', tabError);
      }
    }
    
    logger.info('No displayed email found in any checked tab');
    return null;
  } catch (e) {
    logger.error('Error capturing current email:', e);
    return null;
  }
}

async function getCapturedSelectedEmails(activeTabsOnly = true) {
  try {
    logger.debug('Capturing selected emails', activeTabsOnly ? 'from active tabs only' : 'from all tabs');
    
    // First check if we're in a standalone window or the main window
    const currentWindow = await browser.windows.getCurrent();
    let mailTabs;
    
    // If we're in a popup/standalone window and need active tabs only
    if (currentWindow.type === 'popup' && activeTabsOnly) {
      logger.debug('In standalone window, checking active mail tabs in all windows');
      
      // Get all windows
      const allWindows = await browser.windows.getAll();
      const normalWindows = allWindows.filter(win => win.type === 'normal');
      
      // Find focused window if any
      const focusedWindow = normalWindows.find(win => win.focused);
      
      if (focusedWindow) {
        // If there's a focused window, check its active mail tabs
        mailTabs = await browser.mailTabs.query({ active: true, windowId: focusedWindow.id });
        logger.debug('Checking active mail tabs in focused window:', focusedWindow.id);
      } else if (normalWindows.length > 0) {
        // If no focused window but normal windows exist, check active tabs in all of them
        mailTabs = [];
        for (const win of normalWindows) {
          const windowMailTabs = await browser.mailTabs.query({ active: true, windowId: win.id });
          mailTabs.push(...windowMailTabs);
        }
        logger.debug('No focused window, checking active mail tabs across all windows');
      } else {
        logger.warn('No normal windows found');
        return [];
      }
    } 
    // If we're in a popup and want all tabs (not just active)
    else if (currentWindow.type === 'popup' && !activeTabsOnly) {
      logger.debug('In standalone window, checking all mail tabs');
      mailTabs = await browser.mailTabs.query({});
    } 
    // If we're in a normal window
    else {
      // Only check active mail tabs in current window
      mailTabs = await browser.mailTabs.query({ active: true, currentWindow: true });
      logger.debug('In normal window, checking active mail tabs:', mailTabs.length);
    }
    
    // No mail tabs found
    if (!mailTabs || mailTabs.length === 0) {
      logger.warn('No mail tabs found that match criteria');
      return [];
    }
    
    // Get selected messages only from matching mail tabs
    let allSelectedEmails = [];
    
    for (const mailTab of mailTabs) {
      try {
        logger.debug('Checking mail tab for selected emails:', mailTab.id);
        const selectedMessages = await browser.mailTabs.getSelectedMessages(mailTab.id);
        
        if (selectedMessages && selectedMessages.messages && selectedMessages.messages.length > 0) {
          const emails = selectedMessages.messages.map(email => ({
            id: email.id,
            subject: email.subject,
            author: email.author,
            date: email.date,
            tabId: mailTab.id  // Include tab ID for reference
          }));
          logger.info('Captured selected emails in tab', mailTab.id, ':', emails.length);
          allSelectedEmails = allSelectedEmails.concat(emails);
        }
      } catch (tabError) {
        logger.warn('Error checking mail tab', mailTab.id, ':', tabError);
        // Continue checking other tabs
      }
    }
    
    return allSelectedEmails;
  } catch (e) {
    logger.error('Error capturing selected emails:', e);
    return [];
  }
}

// message handler from sidebar/options
browser.runtime.onMessage.addListener(async (msg, sender) => {
  // Provide context for chat window (current/selected email, etc.)
  if (msg.type === 'getContextForChat') {
    let context = {};
    // Try to get current email
    try {
      const currentEmail = await getCapturedCurrentEmail();
      if (currentEmail) {
        context.currentEmail = currentEmail;
        console.log('Retrieved current email for context:', currentEmail.subject);
      }
    } catch (e) {console.error('Error getting displayed message:', e);}
    
    // Try to get selected emails
    try {
      const selectedEmails = await getCapturedSelectedEmails();
      if (selectedEmails && selectedEmails.length > 0) {
        context.selectedEmails = selectedEmails;
        console.log('Retrieved selected emails for context:', selectedEmails.length);
      }
    } catch (e) {console.error('Error getting selected emails:', e);}
    
    return context;
  }

  // Get current displayed email - real-time for standalone window
  if (msg.type === 'getCurrentDisplayedEmailForContext') {
    logger.debug('Getting current displayed email for context', msg.fromStandaloneWindow ? '(from standalone window)' : '');
    try {
      // Use our enhanced function to find displayed email across windows if needed
      const email = await getCapturedCurrentEmail();
      
      // If we just want to check if there's a displayed email
      if (msg.checkExistenceOnly) {
        return { 
          ok: true, 
          exists: Boolean(email),
          message: email
        };
      }
      
      // No email found
      if (!email) {
        logger.info('No email currently displayed in any window');
        return { ok: false, error: 'No email currently displayed' };
      }
      
      // Get full content if available
      try {
        logger.debug('Getting full content for email:', email.id);
        const fullContent = await browser.messages.getFull(email.id);
        logger.info('Successfully retrieved full email content');
        
        // Extract body content directly for easier access
        let bodyContent = '';
        if (fullContent.parts && Array.isArray(fullContent.parts)) {
          logger.debug('Email has', fullContent.parts.length, 'parts');
          
          // Log part information for debugging
          fullContent.parts.forEach((part, idx) => {
            logger.debug(`Part ${idx} contentType:`, part.contentType, 'Body present:', !!part.body, 'Body length:', part.body ? part.body.length : 0);
          });
          
          // Extract text content
          bodyContent = fullContent.parts
            .filter(part => part.body && (
              part.contentType === 'text/plain' || 
              part.contentType === 'text/html'
            ))
            .map(part => part.body || '')
            .join('\n\n');
        }
        
        return {
          ok: true,
          message: {
            ...email,
            parts: fullContent.parts,
            body: bodyContent // Add body directly to the message object
          }
        };
      } catch (err) {
        logger.warn('Could not get full email content:', err);
        // Return without parts if we couldn't get content
        return { ok: true, message: email };
      }
    } catch (error) {
      logger.error('Error getting displayed email:', error);
      return { ok: false, error: String(error) };
    }
  }
  
  // Get current selected emails - real-time for standalone window
  if (msg.type === 'getCurrentSelectedEmailsForContext') {
    logger.debug('Getting current selected emails for context', msg.fromStandaloneWindow ? '(from standalone window)' : '');
    try {
      // Default to active tabs only, but allow override with includeAllTabs parameter
      const activeTabsOnly = !msg.includeAllTabs;
      logger.debug('Using active tabs only:', activeTabsOnly);
      
      // Use our enhanced function to get selected emails from active tabs only
      const selectedEmails = await getCapturedSelectedEmails(activeTabsOnly);
      
      if (selectedEmails && selectedEmails.length > 0) {
        logger.info('Found', selectedEmails.length, 'selected emails for context in active tabs');
      } else {
        logger.info('No selected emails found for context in active tabs');
      }
      
      // If we just want to check if there are selected emails
      if (msg.checkExistenceOnly) {
        return {
          ok: true,
          messages: selectedEmails
        };
      }
      
      return {
        ok: true,
        messages: selectedEmails
      };
    } catch (error) {
      logger.error('Error getting selected emails:', error);
      return { ok: false, error: String(error) };
    }
  }
  // Provide current draft body to popup
  if (msg.type === 'getCurrentDraftForEdit') {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const composeTab = tabs.find(t => t.type === 'compose');
      if (!composeTab) return { ok: false, error: 'No active compose tab' };
      const details = await browser.compose.getComposeDetails(composeTab.id);
      return { ok: true, body: details.body || '' };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  // Simulate AI edit (replace with real API call)
  if (msg.type === 'copilotEditDraftAI') {
    // For now, just append the prompt to the body as a fake edit
    try {
      const newBody = (msg.body || '') + '\n\n[Copilot edit: ' + msg.prompt + ']';
      return { ok: true, result: newBody };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  // Overwrite draft in compose window
  if (msg.type === 'overwriteDraftWithCopilot') {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const composeTab = tabs.find(t => t.type === 'compose');
      if (!composeTab) return { ok: false, error: 'No active compose tab' };
      await browser.compose.setComposeDetails(composeTab.id, { body: msg.newBody });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }
  logger.debug('Received message:', msg.type);
  
  if (msg.type === 'openCopilotEditDraft') {
    // Open Copilot edit window with current draft as context
    try {
      // Get the active compose tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const composeTab = tabs.find(t => t.type === 'compose');
      if (!composeTab) {
        logger.warn('No active compose tab found');
        return { ok: false, error: 'No active compose tab found' };
      }

      // Get current compose details
      const details = await browser.compose.getComposeDetails(composeTab.id);

      // Open a new Copilot window (sidebar or popup) with draft context and user prompt
      // This is a placeholder: implement your Copilot UI logic here
      // For now, just log and return details
      logger.info('Opening Copilot edit window for draft', details.subject);
      // TODO: Actually open Copilot edit UI and pass details + msg.editPrompt
      return { ok: true, composeTabId: composeTab.id, details };
    } catch (err) {
      logger.error('Error opening Copilot edit draft:', err);
      return { ok: false, error: String(err) };
    }
  }

  if (msg.type === 'getDisplayedMessage') {
    try {
      // Use our enhanced function to find displayed email across windows if needed
      const email = await getCapturedCurrentEmail();
      
      if (!email) {
        logger.warn('No message displayed in any tab');
        return { ok: false, error: 'No message currently displayed' };
      }
      
      logger.info('Successfully found displayed message:', email.subject);
      
      // Get the full message with body content
      const full = await browser.messages.getFull(email.id);
      
      // Merge the header info with full message data
      const completeMessage = {
        ...email,
        parts: full.parts
      };
      
      return { ok: true, message: completeMessage };
      
    } catch (error) {
      logger.error('Error getting displayed message:', error);
      return { ok: false, error: `Failed to get displayed message: ${error.message}` };
    }
  }

  if (msg.type === 'searchMessages') {
    // Example search: {query: {subject: "meeting"}}
    try {
      logger.debug('Searching messages with query:', msg.query);
      const result = await browser.messages.query(msg.query);
      logger.info('Search completed, found messages:', result.messages?.length || 0);
      return { ok: true, messages: result.messages || [] };
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
      
      // Extract body content from message parts with better debugging
      if (fullMessage.parts && Array.isArray(fullMessage.parts)) {
        logger.debug('Message has', fullMessage.parts.length, 'parts');
        
        // Function to extract body text recursively from all parts
        function extractBodyFromParts(parts) {
          let textContent = [];
          
          if (!parts || !Array.isArray(parts)) return '';
          
          // Process each part
          parts.forEach((part, idx) => {
            logger.debug(`Part ${idx} contentType:`, part.contentType, 'Body present:', !!part.body, 'Body length:', part.body ? part.body.length : 0);
            
            // If it's text content, add it
            if (part.body && (part.contentType === 'text/plain' || part.contentType === 'text/html')) {
              textContent.push(part.body);
            } 
            // If it's multipart, process its subparts
            else if (part.contentType && part.contentType.startsWith('multipart/') && part.parts && Array.isArray(part.parts)) {
              logger.debug(`Processing ${part.parts.length} subparts in multipart content`);
              const subpartContent = extractBodyFromParts(part.parts);
              if (subpartContent) textContent.push(subpartContent);
            }
          });
          
          return textContent.join('\n\n');
        }
        
        // Extract all text content recursively
        body = extractBodyFromParts(fullMessage.parts);
      } else {
        logger.warn('Message has no parts or parts is not an array:', fullMessage);
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
      
      // By default, only consider active tabs, but allow override
      const activeTabsOnly = msg.activeTabsOnly !== false;
      logger.debug('Using active tabs only:', activeTabsOnly);
      
      // Use our enhanced function to get selected emails
      const selectedEmails = await getCapturedSelectedEmails(activeTabsOnly);
      
      if (!selectedEmails || selectedEmails.length === 0) {
        logger.info('No messages selected in active tabs');
        return { ok: true, messages: [] };
      }
      
      logger.info('Found selected messages in active tabs:', selectedEmails.length);
      
      // Return the selected emails
      return { 
        ok: true, 
        messages: selectedEmails
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