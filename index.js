// index.js - Main entry point for the modern chat interface

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const promptTextarea = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const addContextBtn = document.getElementById('addContextBtn');
const contextDropdown = document.getElementById('contextDropdown');
const contextText = document.getElementById('contextText');
const contextPillsInline = document.getElementById('contextPillsInline');
const apiWarning = document.getElementById('apiWarning');
const openOptionsLink = document.getElementById('openOptions');
const addCurrentEmailBtn = document.getElementById('addCurrentEmail');
const addSelectedEmailsBtn = document.getElementById('addSelectedEmails');
const addContactsBtn = document.getElementById('addContacts');
const addTextSelectionBtn = document.getElementById('addTextSelection');
const browseEmailsBtn = document.getElementById('browseEmails');
const quickActionBtns = document.querySelectorAll('.quick-action-btn');
const clearChatBtn = document.getElementById('clearChatBtn');
const chatHeader = document.getElementById('chatHeader');

// Conversation state tracking
let conversationStarted = false;

// Initialize modules with DOM references
if (typeof ContextManager !== 'undefined') {
  ContextManager.init({
    contextText,
    chatMessages,
    addSelectedEmailsBtn,
    contextPillsInline
  });
} else {
  console.error('ContextManager not loaded');
}

if (typeof AIIntegration !== 'undefined') {
  AIIntegration.init({
    chatMessages
  });
} else {
  console.error('AIIntegration not loaded');
}

// Auto-resize textarea
function autoResizeTextarea() {
  if (typeof Utils !== 'undefined') {
    Utils.autoResizeTextarea(promptTextarea);
  } else {
    // Fallback implementation
    promptTextarea.style.height = 'auto';
    const scrollHeight = promptTextarea.scrollHeight;
    const maxHeight = 150;
    promptTextarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  }
}

// Manage quick actions visibility
function updateQuickActionsVisibility() {
  const quickActionsContainer = document.querySelector('.quick-actions');
  if (!quickActionsContainer) return;
  
  if (conversationStarted) {
    quickActionsContainer.classList.add('hidden');
    if (chatHeader) chatHeader.classList.add('visible');
  } else {
    quickActionsContainer.classList.remove('hidden');
    if (chatHeader) chatHeader.classList.remove('visible');
  }
}

// Check if conversation has messages
function checkConversationState() {
  const messages = chatMessages.querySelectorAll('.message:not(.system)');
  const hasUserMessages = Array.from(messages).some(msg => 
    msg.classList.contains('user') || msg.classList.contains('assistant')
  );
  
  if (hasUserMessages !== conversationStarted) {
    conversationStarted = hasUserMessages;
    updateQuickActionsVisibility();
  }
}

// Clear conversation and reset state
function clearConversation() {
  // Remove all non-system messages
  const messages = chatMessages.querySelectorAll('.message:not(.system)');
  messages.forEach(msg => msg.remove());
  
  // Reset conversation state
  conversationStarted = false;
  updateQuickActionsVisibility();
}

promptTextarea.addEventListener('input', autoResizeTextarea);

// Open options page
openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

// Clear chat button
clearChatBtn.addEventListener('click', () => {
  clearConversation();
});

// Quick action buttons
quickActionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) {
      promptTextarea.value = prompt;
      autoResizeTextarea();
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
    if (typeof ContextManager !== 'undefined') {
      try {
        await ContextManager.updateSelectedEmailsVisibility();
      } catch (error) {
        console.error('Error updating selected emails visibility:', error);
      }
    }
    
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
  if (typeof Utils !== 'undefined') {
    Utils.closeContextDropdown(contextDropdown);
  } else {
    // Fallback implementation
    contextDropdown.style.display = 'none';
    contextDropdown.classList.remove('dropdown-up');
  }
});

// Prevent dropdown from closing when clicking inside
contextDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Context option event listeners
addCurrentEmailBtn.addEventListener('click', async () => {
  if (typeof ContextManager !== 'undefined') {
    try {
      await ContextManager.addCurrentEmail();
    } catch (error) {
      console.error('Error adding current email:', error);
    }
  }
  
  if (typeof Utils !== 'undefined') {
    Utils.closeContextDropdown(contextDropdown);
  } else {
    contextDropdown.style.display = 'none';
  }
});

addSelectedEmailsBtn.addEventListener('click', async () => {
  if (typeof ContextManager !== 'undefined') {
    try {
      await ContextManager.addSelectedEmails();
    } catch (error) {
      console.error('Error adding selected emails:', error);
    }
  }
  
  if (typeof Utils !== 'undefined') {
    Utils.closeContextDropdown(contextDropdown);
  } else {
    contextDropdown.style.display = 'none';
  }
});

addContactsBtn.addEventListener('click', async () => {
  if (typeof ContextManager !== 'undefined') {
    try {
      await ContextManager.addContacts();
    } catch (error) {
      console.error('Error adding contacts:', error);
    }
  }
  
  if (typeof Utils !== 'undefined') {
    Utils.closeContextDropdown(contextDropdown);
  } else {
    contextDropdown.style.display = 'none';
  }
});

addTextSelectionBtn.addEventListener('click', async () => {
  if (typeof ContextManager !== 'undefined') {
    try {
      await ContextManager.addTextSelection();
    } catch (error) {
      console.error('Error adding text selection:', error);
    }
  }
  
  if (typeof Utils !== 'undefined') {
    Utils.closeContextDropdown(contextDropdown);
  } else {
    contextDropdown.style.display = 'none';
  }
});

browseEmailsBtn.addEventListener('click', async () => {
  try {
    if (typeof Utils !== 'undefined') {
      Utils.logger.debug('Opening email browser');
      Utils.closeContextDropdown(contextDropdown);
    } else {
      console.log('Opening email browser');
      contextDropdown.style.display = 'none';
    }
    
    if (typeof ContextManager !== 'undefined') {
      await ContextManager.showEmailBrowser();
    } else {
      console.error('ContextManager not available');
    }
  } catch (error) {
    console.error('Error opening email browser:', error);
    
    if (typeof UIComponents !== 'undefined') {
      UIComponents.addMessageToChat(chatMessages, 'system', `❌ Error: ${error.message}`);
    }
  }
});

// Send message function
async function sendMessage() {
  const userMessage = promptTextarea.value.trim();
  
  if (!userMessage) {
    return;
  }
  
  // Mark conversation as started
  if (!conversationStarted) {
    conversationStarted = true;
    updateQuickActionsVisibility();
  }
  
  // Clear input
  promptTextarea.value = '';
  autoResizeTextarea();
  
  // Send to AI
  if (typeof AIIntegration !== 'undefined') {
    try {
      await AIIntegration.sendMessage(userMessage, sendBtn);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback error display
      if (typeof UIComponents !== 'undefined') {
        UIComponents.addMessageToChat(chatMessages, 'system', `❌ Error: ${error.message}`);
      } else {
        // Simple fallback
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = `❌ Error: ${error.message}`;
        chatMessages.appendChild(messageDiv);
      }
    }
  } else {
    console.error('AIIntegration not loaded');
    
    // Simple fallback
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = '❌ AI integration not loaded. Please refresh the page.';
    chatMessages.appendChild(messageDiv);
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

// Initialize application
async function initialize() {
  console.log('Initializing modern chat UI');
  
  try {
    // Check API key and update UI
    if (typeof AIIntegration !== 'undefined') {
      await AIIntegration.checkApiKey(apiWarning);
    } else {
      console.error('AIIntegration not available for API key check');
    }
    
    // Update context UI
    if (typeof ContextManager !== 'undefined') {
      ContextManager.updateContextUI();
    } else {
      console.error('ContextManager not available for context UI update');
    }
    
    // Initialize quick actions visibility
    updateQuickActionsVisibility();
    
    // Welcome message
    if (typeof UIComponents !== 'undefined') {
      UIComponents.addMessageToChat(chatMessages, 'system', '👋 Welcome! I can help you analyze your emails. Add some context and ask me anything!');
    } else {
      // Fallback welcome message
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message system';
      messageDiv.textContent = '👋 Welcome! I can help you analyze your emails. Add some context and ask me anything!';
      messageDiv.style.background = '#f8f9fa';
      messageDiv.style.color = '#666';
      messageDiv.style.border = '1px solid #e1e5e9';
      messageDiv.style.fontStyle = 'italic';
      messageDiv.style.margin = '8px auto';
      messageDiv.style.maxWidth = '90%';
      messageDiv.style.textAlign = 'center';
      messageDiv.style.fontSize = '12px';
      chatMessages.appendChild(messageDiv);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Listen for storage changes to update API key status
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.openaiApiKey) {
    console.log('API key changed, rechecking...');
    
    if (typeof AIIntegration !== 'undefined') {
      AIIntegration.checkApiKey(apiWarning);
    } else {
      console.error('AIIntegration not available for API key recheck');
    }
  }
});

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  // Ensure all modules are loaded before initializing
  if (typeof Utils !== 'undefined' && 
      typeof UIComponents !== 'undefined' && 
      typeof ContextManager !== 'undefined' && 
      typeof AIIntegration !== 'undefined') {
    initialize();
  } else {
    console.error('Not all modules loaded properly');
    setTimeout(() => {
      if (typeof Utils !== 'undefined' && 
          typeof UIComponents !== 'undefined' && 
          typeof ContextManager !== 'undefined' && 
          typeof AIIntegration !== 'undefined') {
        initialize();
      } else {
        console.error('Modules still not loaded, check console for errors');
      }
    }, 100);
  }
});