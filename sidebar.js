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

// Update context indicator
function updateContextUI() {
  const count = emailContext.length;
  
  if (count === 0) {
    contextText.textContent = 'No context';
    contextIndicator.querySelector('.context-dot')?.remove();
  } else {
    contextText.textContent = `${count} email${count > 1 ? 's' : ''} in context`;
    
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
    
    // Build context from emails
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
    
    const fullPrompt = contextContent + userMessage;
    
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
    addMessageToChat('assistant', aiResponse);
    
    logger.info('OpenAI request completed successfully');
    
  } catch (error) {
    logger.error('Error calling OpenAI:', error);
    removeLoading();
    addMessageToChat('assistant', `❌ Error: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
  }
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
