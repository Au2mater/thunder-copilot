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
let textSelectionContext = [];
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
const addSelectedEmailsBtn = document.getElementById('addSelectedEmails');
const addContactsBtn = document.getElementById('addContacts');
const addTextSelectionBtn = document.getElementById('addTextSelection');
const browseEmailsBtn = document.getElementById('browseEmails');
const quickActionBtns = document.querySelectorAll('.quick-action-btn');

// Helper function to close dropdown properly
function closeContextDropdown() {
  contextDropdown.style.display = 'none';
  contextDropdown.classList.remove('dropdown-up');
}

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

// Check for selected emails and show/hide the option
async function updateSelectedEmailsVisibility() {
  try {
    logger.debug('Checking for selected emails...');
    const result = await browser.runtime.sendMessage({ type: 'getSelectedEmails' });
    
    if (result && result.ok && result.messages && result.messages.length > 0) {
      logger.debug('Found selected emails:', result.messages.length);
      addSelectedEmailsBtn.style.display = 'block';
      
      // Update the button text to show count
      const count = result.messages.length;
      addSelectedEmailsBtn.textContent = `Selected emails (${count})`;
    } else {
      logger.debug('No emails selected');
      addSelectedEmailsBtn.style.display = 'none';
    }
  } catch (error) {
    logger.error('Error checking selected emails:', error);
    addSelectedEmailsBtn.style.display = 'none';
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
addContextBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const isVisible = contextDropdown.style.display === 'block';
  
  if (isVisible) {
    contextDropdown.style.display = 'none';
  } else {
    // Update selected emails visibility before showing dropdown
    await updateSelectedEmailsVisibility();
    
    // Show dropdown and calculate positioning
    contextDropdown.style.display = 'block';
    
    // Check if dropdown would be clipped at bottom
    const dropdownRect = contextDropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - dropdownRect.bottom;
    
    // If not enough space below (less than 20px margin), show above
    if (spaceBelow < 20) {
      contextDropdown.classList.add('dropdown-up');
    } else {
      contextDropdown.classList.remove('dropdown-up');
    }
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  closeContextDropdown();
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
  
  closeContextDropdown();
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
  
  closeContextDropdown();
});

// Add text selection to context
addTextSelectionBtn.addEventListener('click', async () => {
  try {
    logger.debug('Adding text selection to context');
    
    // Get the active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      addMessageToChat('system', '❌ No active tab found');
      closeContextDropdown();
      return;
    }
    
    const activeTab = tabs[0];
    logger.debug('Active tab:', activeTab.id, activeTab.type);
    
    // Execute script to get selected text
    const results = await browser.tabs.executeScript(activeTab.id, {
      code: `
        (function() {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();
          
          if (!selectedText) {
            return { success: false, error: 'No text selected' };
          }
          
          // Get some context around the selection
          let contextInfo = '';
          try {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            
            // Try to find parent element with useful context
            let contextElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
            while (contextElement && contextElement !== document.body) {
              if (contextElement.tagName && 
                  ['P', 'DIV', 'ARTICLE', 'SECTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(contextElement.tagName)) {
                break;
              }
              contextElement = contextElement.parentElement;
            }
            
            if (contextElement) {
              contextInfo = contextElement.textContent || '';
              // Limit context length
              if (contextInfo.length > 500) {
                contextInfo = contextInfo.substring(0, 500) + '...';
              }
            }
          } catch (e) {
            // Context extraction failed, but we still have the selection
          }
          
          return {
            success: true,
            selectedText: selectedText,
            contextText: contextInfo,
            source: document.title || 'Unknown source'
          };
        })();
      `
    });
    
    if (results && results[0]) {
      const result = results[0];
      
      if (result.success) {
        const selectionData = {
          id: Date.now(),
          text: result.selectedText,
          context: result.contextText,
          source: result.source,
          timestamp: new Date().toISOString()
        };
        
        textSelectionContext.push(selectionData);
        updateContextUI();
        
        logger.info('Text selection added to context:', result.selectedText.substring(0, 50) + '...');
        addMessageToChat('system', `✅ Added selected text: "${result.selectedText.substring(0, 50)}${result.selectedText.length > 50 ? '...' : ''}" from ${result.source}`);
      } else {
        logger.warn('No text selected:', result.error);
        addMessageToChat('system', `⚠️ ${result.error}. Please select some text first.`);
      }
    } else {
      logger.error('Failed to execute selection script');
      addMessageToChat('system', '❌ Failed to capture text selection');
    }
  } catch (error) {
    logger.error('Error adding text selection to context:', error);
    addMessageToChat('system', `❌ Error: ${error.message}`);
  }
  
  closeContextDropdown();
});

// Add selected emails to context
addSelectedEmailsBtn.addEventListener('click', async () => {
  try {
    logger.debug('Adding selected emails to context');
    
    const result = await browser.runtime.sendMessage({ type: 'getSelectedEmails' });
    
    if (!result || !result.ok) {
      addMessageToChat('system', `❌ Failed to get selected emails: ${result?.error || 'Unknown error'}`);
      closeContextDropdown();
      return;
    }
    
    const selectedEmails = result.messages || [];
    
    if (selectedEmails.length === 0) {
      addMessageToChat('system', '❌ No emails selected in Thunderbird');
      closeContextDropdown();
      return;
    }
    
    logger.info('Processing selected emails:', selectedEmails.length);
    
    // Get full content for each selected email
    const emailsWithContent = [];
    for (const email of selectedEmails) {
      try {
        const contentResult = await browser.runtime.sendMessage({
          type: 'getMessageContent',
          messageId: email.id
        });
        
        if (contentResult && contentResult.ok) {
          emailsWithContent.push({
            ...email,
            body: contentResult.body || ''
          });
        } else {
          // Add email without body if content retrieval fails
          emailsWithContent.push({
            ...email,
            body: ''
          });
        }
      } catch (error) {
        logger.warn('Failed to get content for email:', email.id, error);
        emailsWithContent.push({
          ...email,
          body: ''
        });
      }
    }
    
    // Add to context
    if (emailContext.length > 0) {
      emailContext.push(...emailsWithContent);
    } else {
      emailContext = emailsWithContent;
    }
    
    updateContextUI();
    addMessageToChat('system', `✅ Added ${emailsWithContent.length} selected emails to context`);
    
  } catch (error) {
    logger.error('Error adding selected emails to context:', error);
    addMessageToChat('system', `❌ Error: ${error.message}`);
  }
  
  closeContextDropdown();
});

// Browse emails for context
browseEmailsBtn.addEventListener('click', async () => {
  try {
    logger.debug('Opening email browser');
    closeContextDropdown();
    await showEmailBrowser();
  } catch (error) {
    logger.error('Error opening email browser:', error);
    addMessageToChat('system', `❌ Error: ${error.message}`);
  }
});

// Update context indicator
function updateContextUI() {
  const emailCount = emailContext.length;
  const contactCount = contactsContext.length;
  const selectionCount = textSelectionContext.length;
  const totalItems = emailCount + (contactCount > 0 ? 1 : 0) + selectionCount; // Contacts count as 1 item
  
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
    if (selectionCount > 0) {
      parts.push(`${selectionCount} selection${selectionCount > 1 ? 's' : ''}`);
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
    
    // Build context from emails, contacts, and text selections
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
    
    if (textSelectionContext.length > 0) {
      contextContent += 'Here are text selections for reference:\n\n';
      textSelectionContext.forEach((selection, idx) => {
        contextContent += `--- Selection ${idx + 1} ---\n`;
        contextContent += `Source: ${selection.source}\n`;
        contextContent += `Selected text: ${selection.text}\n`;
        if (selection.context && selection.context !== selection.text) {
          contextContent += `Context: ${selection.context}\n`;
        }
        contextContent += `\n`;
      });
      contextContent += '--- End of text selections ---\n\n';
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

// Show email browser modal for multiple email selection
async function showEmailBrowser() {
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
    width: 90%;
    max-width: 600px;
    max-height: 80%;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
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
  title.textContent = 'Select Emails for Context';
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
  
  // Search input
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid #e1e5e9;
  `;
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search emails by subject, sender, or content...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  `;
  
  searchContainer.appendChild(searchInput);
  
  // Email list container
  const emailList = document.createElement('div');
  emailList.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  `;
  
  // Selected emails display
  const selectedContainer = document.createElement('div');
  selectedContainer.style.cssText = `
    padding: 16px 20px;
    border-top: 1px solid #e1e5e9;
    background: #f8f9fa;
    border-radius: 0 0 12px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const selectedCount = document.createElement('span');
  selectedCount.textContent = '0 emails selected';
  selectedCount.style.cssText = 'font-size: 14px; color: #666;';
  
  const addSelectedBtn = document.createElement('button');
  addSelectedBtn.textContent = 'Add to Context';
  addSelectedBtn.disabled = true;
  addSelectedBtn.style.cssText = `
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
  
  let selectedEmails = [];
  
  // Function to update selected count
  function updateSelectedCount() {
    selectedCount.textContent = `${selectedEmails.length} email${selectedEmails.length !== 1 ? 's' : ''} selected`;
    addSelectedBtn.disabled = selectedEmails.length === 0;
    if (selectedEmails.length === 0) {
      addSelectedBtn.style.background = '#ccc';
      addSelectedBtn.style.cursor = 'not-allowed';
    } else {
      addSelectedBtn.style.background = '#28a745';
      addSelectedBtn.style.cursor = 'pointer';
    }
  }
  
  // Function to load and display emails
  async function loadEmails(searchQuery = '') {
    try {
      emailList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading emails...</div>';
      
      // Search for emails
      const query = searchQuery ? { subjectContains: searchQuery } : {};
      const result = await browser.runtime.sendMessage({ 
        type: 'searchMessages', 
        query: query 
      });
      
      if (result.ok) {
        emailList.innerHTML = '';
        const messages = result.result.messages || [];
        
        if (messages.length === 0) {
          emailList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No emails found</div>';
          return;
        }
        
        // Display messages
        messages.slice(0, 50).forEach(message => { // Limit to 50 for performance
          const emailItem = document.createElement('div');
          emailItem.style.cssText = `
            padding: 12px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
          `;
          
          const isSelected = selectedEmails.some(e => e.id === message.id);
          if (isSelected) {
            emailItem.style.background = '#e8f4f8';
            emailItem.style.borderColor = '#007AFF';
          }
          
          emailItem.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 4px; font-size: 14px;">${escapeHtml(message.subject || '(No subject)')}</div>
            <div style="color: #666; font-size: 13px; margin-bottom: 4px;">From: ${escapeHtml(message.author || 'Unknown')}</div>
            <div style="color: #999; font-size: 12px;">${new Date(message.date).toLocaleDateString()}</div>
          `;
          
          emailItem.addEventListener('click', () => {
            const selectedIndex = selectedEmails.findIndex(e => e.id === message.id);
            if (selectedIndex >= 0) {
              // Remove from selection
              selectedEmails.splice(selectedIndex, 1);
              emailItem.style.background = '';
              emailItem.style.borderColor = '#e1e5e9';
            } else {
              // Add to selection
              selectedEmails.push(message);
              emailItem.style.background = '#e8f4f8';
              emailItem.style.borderColor = '#007AFF';
            }
            updateSelectedCount();
          });
          
          emailItem.addEventListener('mouseenter', () => {
            if (!selectedEmails.some(e => e.id === message.id)) {
              emailItem.style.background = '#f8f9fa';
            }
          });
          
          emailItem.addEventListener('mouseleave', () => {
            if (!selectedEmails.some(e => e.id === message.id)) {
              emailItem.style.background = '';
            }
          });
          
          emailList.appendChild(emailItem);
        });
        
        if (messages.length > 50) {
          const moreInfo = document.createElement('div');
          moreInfo.style.cssText = 'padding: 12px; text-align: center; color: #666; font-style: italic;';
          moreInfo.textContent = `Showing first 50 of ${messages.length} emails. Use search to narrow results.`;
          emailList.appendChild(moreInfo);
        }
      } else {
        emailList.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">Error loading emails: ${result.error}</div>`;
      }
    } catch (error) {
      logger.error('Error loading emails:', error);
      emailList.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">Error: ${error.message}</div>`;
    }
  }
  
  // Search functionality
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadEmails(searchInput.value.trim());
    }, 300);
  });
  
  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  // Add selected emails handler
  addSelectedBtn.addEventListener('click', async () => {
    if (selectedEmails.length === 0) return;
    
    try {
      // Get full email content for selected emails
      for (const email of selectedEmails) {
        // Check if already in context
        const exists = emailContext.some(e => e.id === email.id);
        
        if (!exists) {
          // Get full email content
          const fullMessage = await browser.runtime.sendMessage({
            type: 'getMessageContent',
            messageId: email.id
          });
          
          if (fullMessage && fullMessage.ok) {
            emailContext.push({
              id: email.id,
              subject: email.subject,
              author: email.author,
              date: email.date,
              body: fullMessage.body || ''
            });
          } else {
            // Fallback to basic info
            emailContext.push({
              id: email.id,
              subject: email.subject,
              author: email.author,
              date: email.date,
              body: ''
            });
          }
        }
      }
      
      updateContextUI();
      addMessageToChat('system', `✅ Added ${selectedEmails.length} email${selectedEmails.length !== 1 ? 's' : ''} to context`);
      closeModal();
    } catch (error) {
      logger.error('Error adding emails to context:', error);
      addMessageToChat('system', `❌ Error adding emails: ${error.message}`);
    }
  });
  
  // Build modal
  selectedContainer.appendChild(selectedCount);
  selectedContainer.appendChild(addSelectedBtn);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  modal.appendChild(header);
  modal.appendChild(searchContainer);
  modal.appendChild(emailList);
  modal.appendChild(selectedContainer);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Load initial emails
  await loadEmails();
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
