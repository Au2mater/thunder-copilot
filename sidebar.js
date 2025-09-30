// sidebar.js - Modern chat interface script

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

logger.info('Modern chat sidebar script loaded');

// Store email context (messages to include in AI prompts)
let emailContext = [];
let contactsContext = [];
let isApiKeyValid = false;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const promptTextarea = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const addContextBtn = document.getElementById('addContextBtn');
const contextDropdown = document.getElementById('contextDropdown');
const contextIndicator = document.getElementById('contextIndicator');
const contextText = document.getElementById('contextText');
const apiWarning = document.getElementById('apiWarning');
const openOptionsLink = document.getElementById('openOptions');
const addCurrentEmailBtn = document.getElementById('addCurrentEmail');
const addContactsBtn = document.getElementById('addContacts');
const quickActionBtns = document.querySelectorAll('.quick-action-btn');

// Auto-resize textarea
function autoResizeTextarea() {
  promptTextarea.style.height = 'auto';
  const scrollHeight = promptTextarea.scrollHeight;
  const maxHeight = 150;
  promptTextarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
}

promptTextarea.addEventListener('input', autoResizeTextarea);

// Check API key on startup and show/hide warning
async function checkApiKey() {
  try {
    const settings = await browser.storage.local.get('openaiApiKey');
    isApiKeyValid = !!(settings.openaiApiKey && settings.openaiApiKey.trim());
    
    if (isApiKeyValid) {
      apiWarning.style.display = 'none';
      logger.info('API key found');
    } else {
      apiWarning.style.display = 'block';
      logger.warn('No API key configured');
    }
  } catch (error) {
    logger.error('Error checking API key:', error);
    isApiKeyValid = false;
    apiWarning.style.display = 'block';
  }
}

// Open options page
openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

// Quick action buttons
quickActionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) {
      promptTextarea.value = prompt;
      autoResizeTextarea();
      // Optionally auto-send or let user modify
      promptTextarea.focus();
    }
  });
});

// Toggle context dropdown
addContextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = contextDropdown.style.display === 'block';
  contextDropdown.style.display = isVisible ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  contextDropdown.style.display = 'none';
});

// Prevent dropdown from closing when clicking inside
contextDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Add current email to context
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
        
        // Show success message in chat
        addMessageToChat('system', `✅ Added email "${m.subject}" to context`);
      } else {
        logger.warn('Email already in context:', m.subject);
        addMessageToChat('system', `⚠️ Email "${m.subject}" is already in context`);
      }
    } else {
      logger.warn('Failed to add email to context:', r.error);
      addMessageToChat('system', `❌ No email currently displayed: ${r.error}`);
    }
  } catch (error) {
    logger.error('Error adding current email to context:', error);
    addMessageToChat('system', `❌ Error: ${error.message}`);
  }
  
  contextDropdown.style.display = 'none';
});

// Add contacts to context
addContactsBtn.addEventListener('click', async () => {
  try {
    logger.debug('Adding contacts to context');
    const r = await browser.runtime.sendMessage({ type: 'getContacts' });
    
    if (r.ok) {
      contactsContext = r.contacts;
      updateContextUI();
      logger.info('Contacts added to context:', contactsContext.length);
      addMessageToChat('system', `✅ Added ${contactsContext.length} contacts to context`);
    } else {
      logger.warn('Failed to add contacts to context:', r.error);
      addMessageToChat('system', `❌ Failed to load contacts: ${r.error}`);
    }
  } catch (error) {
    logger.error('Error adding contacts to context:', error);
    addMessageToChat('system', `❌ Error: ${error.message}`);
  }
  
  contextDropdown.style.display = 'none';
});

// Update context indicator
function updateContextUI() {
  const emailCount = emailContext.length;
  const contactCount = contactsContext.length;
  const totalItems = emailCount + (contactCount > 0 ? 1 : 0); // Contacts count as 1 item
  
  if (totalItems === 0) {
    contextText.textContent = 'No context';
    contextIndicator.querySelector('.context-dot')?.remove();
  } else {
    const parts = [];
    if (emailCount > 0) {
      parts.push(`${emailCount} email${emailCount > 1 ? 's' : ''}`);
    }
    if (contactCount > 0) {
      parts.push(`${contactCount} contacts`);
    }
    contextText.textContent = parts.join(', ') + ' in context';
    
    if (!contextIndicator.querySelector('.context-dot')) {
      const dot = document.createElement('div');
      dot.className = 'context-dot';
      contextIndicator.insertBefore(dot, contextText);
    }
  }
}

// Add message to chat
function addMessageToChat(type, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  if (type === 'system') {
    messageDiv.style.background = '#f8f9fa';
    messageDiv.style.color = '#666';
    messageDiv.style.border = '1px solid #e1e5e9';
    messageDiv.style.fontStyle = 'italic';
    messageDiv.style.margin = '8px auto';
    messageDiv.style.maxWidth = '90%';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontSize = '12px';
  }
  
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show loading message
function showLoading() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant loading';
  loadingDiv.id = 'loadingMessage';
  
  loadingDiv.innerHTML = `
    <span>Thinking</span>
    <div class="loading-dots">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    </div>
  `;
  
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove loading message
function removeLoading() {
  const loadingMessage = document.getElementById('loadingMessage');
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

// Send message to AI
async function sendMessage() {
  const userMessage = promptTextarea.value.trim();
  
  if (!userMessage) {
    logger.warn('Empty message provided');
    return;
  }
  
  if (!isApiKeyValid) {
    logger.warn('No API key configured');
    addMessageToChat('system', '⚠️ Please set your OpenAI API key in Options to use AI features');
    return;
  }
  
  // Add user message to chat
  addMessageToChat('user', userMessage);
  
  // Clear input
  promptTextarea.value = '';
  autoResizeTextarea();
  
  // Show loading
  showLoading();
  sendBtn.disabled = true;
  
  try {
    logger.info('Making OpenAI request with context emails:', emailContext.length);
    
    // Get fresh API key
    const settings = await browser.storage.local.get('openaiApiKey');
    const apiKey = settings.openaiApiKey;
    
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    // Build context from emails and contacts
    let contextContent = '';
    if (emailContext.length > 0) {
      contextContent = 'Here are the emails to analyze:\n\n';
      emailContext.forEach((email, idx) => {
        contextContent += `--- Email ${idx + 1} ---\n`;
        contextContent += `Subject: ${email.subject}\n`;
        contextContent += `From: ${email.author}\n`;
        contextContent += `Date: ${email.date}\n`;
        contextContent += `Body:\n${email.body.slice(0, 2000)}\n\n`;
      });
      contextContent += '--- End of emails ---\n\n';
    }
    
    if (contactsContext.length > 0) {
      contextContent += 'Here are your contacts for email suggestions:\n\n';
      contactsContext.forEach((contact, idx) => {
        contextContent += `${contact.name} <${contact.email}>\n`;
      });
      contextContent += `\n--- End of contacts (${contactsContext.length} total) ---\n\n`;
    }
    
    // Enhanced system prompt for email drafting
    const systemPrompt = `You are an AI assistant helping with email management. You can:
1. Analyze emails and provide summaries
2. Draft new emails based on user requests
3. Suggest email improvements

When the user asks you to draft, compose, or write an email, respond with a structured format:
EMAIL_DRAFT:
TO: [recipient email(s)]
SUBJECT: [email subject]
BODY:
[email body content]

For other requests, respond normally.`;
    
    const fullPrompt = systemPrompt + '\n\n' + contextContent + userMessage;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      logger.error('OpenAI API error:', data.error);
      throw new Error(data.error.message || 'OpenAI API error');
    }
    
    const aiResponse = data.choices?.[0]?.message?.content || 'No response received';
    
    removeLoading();
    
    // Check if response contains an email draft
    if (aiResponse.includes('EMAIL_DRAFT:')) {
      const draftData = parseEmailDraft(aiResponse);
      if (draftData) {
        addMessageToChat('assistant', aiResponse);
        addDraftActions(draftData);
      } else {
        addMessageToChat('assistant', aiResponse);
      }
    } else {
      addMessageToChat('assistant', aiResponse);
    }
    
    logger.info('OpenAI request completed successfully');
    
  } catch (error) {
    logger.error('Error calling OpenAI:', error);
    removeLoading();
    addMessageToChat('assistant', `❌ Error: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
  }
}

// Parse email draft from AI response
function parseEmailDraft(response) {
  try {
    const lines = response.split('\n');
    let inDraft = false;
    let inBody = false;
    const draft = { to: [], subject: '', body: '' };
    
    for (const line of lines) {
      if (line.includes('EMAIL_DRAFT:')) {
        inDraft = true;
        continue;
      }
      
      if (!inDraft) continue;
      
      if (line.startsWith('TO:')) {
        const toValue = line.substring(3).trim();
        // Handle multiple recipients
        draft.to = toValue.split(/[,;]/).map(email => email.trim()).filter(Boolean);
      } else if (line.startsWith('SUBJECT:')) {
        draft.subject = line.substring(8).trim();
      } else if (line.startsWith('BODY:')) {
        inBody = true;
        continue;
      } else if (inBody) {
        // Stop at next section or end
        if (line.startsWith('---') || line.startsWith('END_')) {
          break;
        }
        draft.body += line + '\n';
      }
    }
    
    draft.body = draft.body.trim();
    
    // Validate draft has required fields
    if (draft.subject || draft.body) {
      return draft;
    }
    
    return null;
  } catch (error) {
    logger.error('Error parsing email draft:', error);
    return null;
  }
}

// Add draft action buttons after AI response
function addDraftActions(draftData) {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'draft-actions';
  actionsDiv.style.cssText = `
    margin: 12px 0;
    padding: 12px;
    background: #f8f9fa;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  `;
  
  const createButton = document.createElement('button');
  createButton.textContent = '✉️ Create Draft';
  createButton.style.cssText = `
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  
  createButton.addEventListener('click', async () => {
    try {
      createButton.disabled = true;
      createButton.textContent = 'Creating...';
      
      logger.info('Creating email draft with data:', draftData);
      
      const result = await browser.runtime.sendMessage({
        type: 'createDraft',
        to: draftData.to,
        subject: draftData.subject,
        body: draftData.body
      });
      
      if (result.ok) {
        addMessageToChat('system', '✅ Email draft created successfully!');
        logger.info('Draft created successfully:', result.composeTabId);
      } else {
        addMessageToChat('system', `❌ Failed to create draft: ${result.error}`);
        logger.error('Failed to create draft:', result.error);
      }
    } catch (error) {
      logger.error('Error creating draft:', error);
      addMessageToChat('system', `❌ Error creating draft: ${error.message}`);
    } finally {
      createButton.disabled = false;
      createButton.textContent = '✉️ Create Draft';
    }
  });
  
  const previewButton = document.createElement('button');
  previewButton.textContent = '👁️ Preview';
  previewButton.style.cssText = `
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  
  previewButton.addEventListener('click', () => {
    showDraftPreview(draftData);
  });
  
  actionsDiv.appendChild(createButton);
  actionsDiv.appendChild(previewButton);
  
  chatMessages.appendChild(actionsDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show draft preview in a modal-like dialog
function showDraftPreview(draftData) {
  const previewText = `
TO: ${draftData.to.join(', ') || '(No recipients)'}
SUBJECT: ${draftData.subject || '(No subject)'}

${draftData.body || '(No body content)'}
  `.trim();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 90%;
    max-height: 80%;
    overflow: auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid #e1e5e9;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Email Draft Preview';
  title.style.cssText = 'margin: 0; font-size: 16px; color: #333;';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
    padding: 4px;
  `;
  
  const content = document.createElement('pre');
  content.textContent = previewText;
  content.style.cssText = `
    padding: 20px;
    margin: 0;
    white-space: pre-wrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
  `;
  
  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Send button click
sendBtn.addEventListener('click', sendMessage);

// Enter key to send (Shift+Enter for new line)
promptTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initialize
logger.info('Initializing modern chat UI');
checkApiKey();
updateContextUI();

// Welcome message
addMessageToChat('system', '👋 Welcome! I can help you analyze your emails. Add some context and ask me anything!');

// Listen for storage changes to update API key status
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.openaiApiKey) {
    logger.info('API key changed, rechecking...');
    checkApiKey();
  }
});
