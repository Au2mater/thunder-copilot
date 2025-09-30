// sidebar.js - Sidebar script with email context management

// Add-on specific logging system
const TB_COPILOT_LOG_PREFIX = '[TB-Copilot-Sidebar]';

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

logger.info('Sidebar script loaded');

// Store email context (messages to include in AI prompts)
let emailContext = [];

// API Key management
const saveKeyBtn = document.getElementById('saveKey');
if (saveKeyBtn) {
  saveKeyBtn.addEventListener('click', async () => {
    try {
      logger.debug('Saving API key');
      const apiKeyInput = document.getElementById('apiKey');
      const keyStatusDiv = document.getElementById('keyStatus');
      
      if (!apiKeyInput || !keyStatusDiv) {
        logger.error('API key elements not found in DOM');
        return;
      }
      
      const key = apiKeyInput.value.trim();
      await browser.storage.local.set({ openaiApiKey: key });
      keyStatusDiv.textContent = key ? 'Saved' : 'Cleared';
      logger.info('API key saved successfully');
    } catch (error) {
      logger.error('Error saving API key:', error);
      const keyStatusDiv = document.getElementById('keyStatus');
      if (keyStatusDiv) {
        keyStatusDiv.textContent = 'Error saving key';
      }
    }
  });
} else {
  logger.warn('saveKey button not found in DOM');
}

// Load stored API key on startup
(async () => {
  try {
    logger.debug('Loading stored API key');
    const s = await browser.storage.local.get('openaiApiKey');
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      apiKeyInput.value = s.openaiApiKey || '';
      if (s.openaiApiKey) {
        logger.info('API key loaded from storage');
      }
    } else {
      logger.warn('apiKey input not found in DOM');
    }
  } catch (error) {
    logger.error('Error loading API key:', error);
  }
})();

// Update the UI to reflect current context
function updateContextUI() {
  const count = emailContext.length;
  document.getElementById('contextCount').textContent = count;
  
  const contextDiv = document.getElementById('emailContext');
  if (count === 0) {
    contextDiv.style.display = 'none';
  } else {
    contextDiv.style.display = 'block';
    contextDiv.innerHTML = emailContext.map((email, idx) => 
      `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
        <strong>${idx + 1}.</strong> ${email.subject}<br/>
        <small>From: ${email.author} | ${new Date(email.date).toLocaleString()}</small>
      </div>`
    ).join('');
  }
}

// Add current email to context
const addCurrentEmailBtn = document.getElementById('addCurrentEmail');
if (addCurrentEmailBtn) {
  addCurrentEmailBtn.addEventListener('click', async () => {
    try {
      logger.debug('Adding current email to context');
      const r = await browser.runtime.sendMessage({ type: 'getDisplayedMessage' });
      if (r.ok) {
        const m = r.message;
        // Check if already in context
        const exists = emailContext.some(e => e.id === m.id);
        if (!exists) {
          emailContext.push({
            id: m.id,
            subject: m.subject,
            author: m.author,
            date: m.date,
            body: m.parts?.map(p => p.body || '').join('\n') || ''
          });
          updateContextUI();
          logger.info('Email added to context:', m.subject);
        } else {
          logger.warn('Email already in context:', m.subject);
          alert('This email is already in context');
        }
      } else {
        logger.warn('Failed to add email to context:', r.error);
        alert(`No message currently displayed: ${r.error}`);
      }
    } catch (error) {
      logger.error('Error adding current email to context:', error);
      alert(`Error: ${error.message}`);
    }
  });
} else {
  logger.warn('addCurrentEmail button not found in DOM');
}

// Clear context
const clearContextBtn = document.getElementById('clearContext');
if (clearContextBtn) {
  clearContextBtn.addEventListener('click', () => {
    logger.info('Clearing email context');
    emailContext = [];
    updateContextUI();
  });
} else {
  logger.warn('clearContext button not found in DOM');
}

// Show current email preview
const readCurrentBtn = document.getElementById('readCurrent');
if (readCurrentBtn) {
  readCurrentBtn.addEventListener('click', async () => {
    try {
      logger.debug('Reading current email');
      const r = await browser.runtime.sendMessage({ type: 'getDisplayedMessage' });
      const messageSummaryElement = document.getElementById('messageSummary');
      
      if (!messageSummaryElement) {
        logger.error('messageSummary element not found in DOM');
        return;
      }
      
      if (r.ok) {
        const m = r.message;
        logger.info('Successfully retrieved current email:', m.subject);
        const summary = `Subject: ${m.subject}\nFrom: ${m.author}\nDate: ${m.date}\n\n${m.parts?.map(p => p.body || '').join('\n').slice(0, 1000)}`;
        messageSummaryElement.textContent = summary;
      } else {
        logger.warn('No message displayed:', r.error);
        messageSummaryElement.textContent = `No message displayed: ${r.error}`;
      }
    } catch (error) {
      logger.error('Error reading current email:', error);
      const messageSummaryElement = document.getElementById('messageSummary');
      if (messageSummaryElement) {
        messageSummaryElement.textContent = `Error: ${error.message}`;
      }
    }
  });
} else {
  logger.warn('readCurrent button not found in DOM');
}

// Search messages
document.getElementById('searchBtn').addEventListener('click', async () => {
  try {
    const term = document.getElementById('searchTerm').value;
    logger.debug('Searching for messages with term:', term);
    const r = await browser.runtime.sendMessage({ type: 'searchMessages', query: { subjectContains: term, pageSize: 25 } });
    if (r.ok) {
      logger.info('Search completed, found messages:', r.result.messages?.length || 0);
      document.getElementById('searchResults').textContent = JSON.stringify(r.result.messages?.map(m => ({ id: m.id, subject: m.subject, author: m.author })) , null, 2);
    } else {
      logger.error('Search failed:', r.error);
      document.getElementById('searchResults').textContent = 'Error: ' + r.error;
    }
  } catch (error) {
    logger.error('Error during search:', error);
    document.getElementById('searchResults').textContent = `Error: ${error.message}`;
  }
});

// Create sample draft
document.getElementById('createSampleDraft').addEventListener('click', async () => {
  try {
    logger.debug('Creating sample draft');
    const r = await browser.runtime.sendMessage({ type: 'createDraft', subject: 'Draft from Copilot', body: 'This draft was created by Copilot.' });
    if (r.ok) {
      logger.info('Draft created successfully, composeTabId:', r.composeTabId);
      alert('Draft created (composeTabId: ' + r.composeTabId + ')');
    } else {
      logger.error('Failed to create draft:', r.error);
      alert('Error: ' + r.error);
    }
  } catch (error) {
    logger.error('Error creating draft:', error);
    alert(`Error: ${error.message}`);
  }
});

// Generate ICS
document.getElementById('genICS').addEventListener('click', async () => {
  try {
    logger.debug('Generating ICS events');
    const events = [
      { uid: 'ev1', start: new Date().toISOString(), end: new Date(Date.now()+3600*1000).toISOString(), summary: 'Test meeting 1', description: 'Generated by Copilot', location: 'Zoom' },
      { uid: 'ev2', start: new Date(Date.now()+86400*1000).toISOString(), end: new Date(Date.now()+90000*1000).toISOString(), summary: 'Test meeting 2', description: 'Generated by Copilot', location: 'Office' }
    ];
    const r = await browser.runtime.sendMessage({ type: 'generateICS', events });
    if (r.ok) {
      logger.info('ICS generated successfully');
      const a = document.getElementById('downloadIcs');
      a.href = r.url;
      a.download = 'events.ics';
      a.style.display = 'inline-block';
      a.textContent = 'Download events.ics';
    } else {
      logger.error('Failed to generate ICS:', r.error);
      alert('ICS generation error: ' + r.error);
    }
  } catch (error) {
    logger.error('Error generating ICS:', error);
    alert(`Error: ${error.message}`);
  }
});

// Ask AI with email context
document.getElementById('ask').addEventListener('click', async () => {
  try {
    logger.debug('Processing AI request');
    const s = await browser.storage.local.get('openaiApiKey');
    const key = s.openaiApiKey;
    if (!key) { 
      logger.warn('No API key configured');
      document.getElementById('aiResponse').textContent = 'No API key configured. Please set it in the add-on settings or save it above.'; 
      return; 
    }
    
    const userPrompt = document.getElementById('prompt').value;
    if (!userPrompt.trim()) {
      logger.warn('Empty prompt provided');
      document.getElementById('aiResponse').textContent = 'Please enter a prompt.';
      return;
    }
    
    document.getElementById('aiResponse').textContent = 'Calling OpenAI...';
    logger.info('Making OpenAI request with context emails:', emailContext.length);
    
    // Build context from emails
    let contextText = '';
    if (emailContext.length > 0) {
      contextText = 'Here are the emails to analyze:\n\n';
      emailContext.forEach((email, idx) => {
        contextText += `--- Email ${idx + 1} ---\n`;
        contextText += `Subject: ${email.subject}\n`;
        contextText += `From: ${email.author}\n`;
        contextText += `Date: ${email.date}\n`;
        contextText += `Body:\n${email.body.slice(0, 2000)}\n\n`;
      });
      contextText += '--- End of emails ---\n\n';
    }
    
    const fullPrompt = contextText + userPrompt;
    
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1000
      })
    });
    const data = await resp.json();
    
    if (data.error) {
      logger.error('OpenAI API error:', data.error);
      document.getElementById('aiResponse').textContent = 'OpenAI error: ' + (data.error.message || JSON.stringify(data.error));
      return;
    }
    
    const text = (data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text)) || JSON.stringify(data);
    document.getElementById('aiResponse').textContent = text;
    logger.info('OpenAI request completed successfully');
  } catch (err) {
    logger.error('Error calling OpenAI:', err);
    document.getElementById('aiResponse').textContent = 'OpenAI error: ' + err;
  }
});

// Collapse toggle
document.getElementById('toggle').addEventListener('click', () => {
  logger.debug('Toggling collapse state');
  const body = document.body;
  if (body.style.display === 'none') { 
    body.style.display = ''; 
    document.getElementById('toggle').textContent = 'Collapse'; 
  } else { 
    body.style.display = 'none'; 
    document.getElementById('toggle').textContent = 'Expand'; 
  }
});

// Initialize
logger.info('Initializing sidebar UI');
updateContextUI();
