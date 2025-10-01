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

// Tool dropdown elements
const addToolBtn = document.getElementById('addToolBtn');
const toolDropdown = document.getElementById('toolDropdown');
const toolBtnContainer = document.getElementById('toolBtnContainer');
const toolCounterBadge = document.getElementById('toolCounterBadge');

// Track enabled tools (for checklist)
let enabledTools = [];

// --- EDIT DRAFT INTEGRATION & CONTEXT RESTORE ---
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const isEditDraft = getQueryParam('editDraft') === '1';
const draftBody = getQueryParam('draftBody') ? decodeURIComponent(getQueryParam('draftBody')) : '';
const draftPrompt = getQueryParam('prompt') ? decodeURIComponent(getQueryParam('prompt')) : '';
const editDraftTool = getQueryParam('editDraftTool') === '1';

// Global flag to prevent duplicate context loading
window.contextIsLoading = false;

// Global flag to prevent multiple context loading
window.contextLoaded = false;

// Restore context if opened as a window (not popup/iframe) and not already loaded
if (window.opener == null && window.top === window && !window.contextLoaded) {
  console.log('Checking for URL parameters first...');
  
  // Check if we have context from URL parameters (passed by the background script)
  const currentEmailParam = getQueryParam('currentEmail');
  const selectedEmailsParam = getQueryParam('selectedEmails');
  let contextAdded = false;
  
  // Create a set to track added email IDs
  window.addedEmailIds = window.addedEmailIds || new Set();
  
  // Add current email first if available
  if (currentEmailParam) {
    try {
      const currentEmail = JSON.parse(decodeURIComponent(currentEmailParam));
      console.log('Found current email in URL params:', currentEmail.subject);
      window.contextLoaded = true; // Mark as loaded immediately to prevent background loading
      
      // Debug information about the email
      console.log('Current email details:', {
        id: currentEmail.id,
        subject: currentEmail.subject,
        hasBody: Boolean(currentEmail.body),
        bodyLength: currentEmail.body ? currentEmail.body.length : 0
      });
      
      // Create email object with isPrimary flag but don't add yet
      // We need to fetch the body content first
      const emailObj = {
        id: currentEmail.id,
        subject: currentEmail.subject,
        author: currentEmail.author,
        date: currentEmail.date,
        body: currentEmail.body || '', // Use body if present in URL param (might be in some cases)
        isPrimary: true // Mark as primary since it's the current email
      };
      
      // Check if we already have this ID
      const isDuplicate = window.addedEmailIds.has(currentEmail.id);
      if (isDuplicate) {
        console.log(`Current email (ID: ${currentEmail.id}) already being added, skipping duplicate`);
      } else {
        // Add to our tracking set
        window.addedEmailIds.add(currentEmail.id);
        
        // Schedule body content fetch and add to context
        (async function() {
          try {
            // Get full message content
            const contentResult = await browser.runtime.sendMessage({
              type: 'getMessageContent',
              messageId: currentEmail.id
            });
            
            // Add the body content if available
            if (contentResult && contentResult.ok) {
              console.log(`Retrieved body content for current email, length: ${contentResult.body.length}`);
              console.log(`Body content preview: ${contentResult.body.substring(0, 50)}...`);
              emailObj.body = contentResult.body || '';
            } else {
              console.warn('Failed to get body content for current email:', contentResult?.error || 'unknown error');
            }
          } catch (err) {
            console.error('Error getting body content for current email:', err);
          } finally {
            // Add to context whether we got the body or not
            ContextManager.emailContext.push(emailObj);
            ContextManager.updateContextUI(); // Update UI after adding the email
            contextAdded = true;
          }
        })();
      }
    } catch (e) {
      console.error('Error parsing current email from URL:', e);
    }
  }
  
  // Then add selected emails with duplicate checking
  if (selectedEmailsParam) {
    try {
      const selectedEmails = JSON.parse(decodeURIComponent(selectedEmailsParam));
      console.log('Found selected emails in URL params:', selectedEmails.length);
      window.contextLoaded = true; // Mark as loaded immediately to prevent background loading
      
      // Debug log the email IDs
      console.log('Selected email IDs:', selectedEmails.map(email => email.id).join(', '));
      if (currentEmailParam) {
        try {
          const currentEmail = JSON.parse(decodeURIComponent(currentEmailParam));
          console.log('Current email ID:', currentEmail.id);
        } catch (e) {}
      }
      
      let addedCount = 0;
      let skippedCount = 0;
      let emailsToProcess = [];
      
      // First identify which emails to add (not duplicates)
      selectedEmails.forEach(email => {
        // Create email object
        const emailObj = {
          id: email.id,
          subject: email.subject,
          author: email.author,
          date: email.date,
          body: '' // Initialize with empty body, will be filled later
        };
        
        // Check if we already added this email ID or if it's in the context
        if (window.addedEmailIds.has(email.id)) {
          console.log(`Skipping duplicate email with ID ${email.id}: ${email.subject} - already being processed`);
          skippedCount++;
        } 
        // Check if it's already in the context
        else if (ContextManager.isItemDuplicate(emailObj, 'email')) {
          console.log(`Skipping duplicate email: ${email.subject} - already in context`);
          skippedCount++;
        } else {
          // Add to tracking set first
          window.addedEmailIds.add(email.id);
          emailsToProcess.push(emailObj); // Add to processing queue
        }
      });
      
      // Now process each non-duplicate email to fetch its content
      (async function() {
        try {
          // Process each email to fetch body content
          for (const emailObj of emailsToProcess) {
            try {
              // Get full message content
              const contentResult = await browser.runtime.sendMessage({
                type: 'getMessageContent',
                messageId: emailObj.id
              });
              
              // Add the body content if available
              if (contentResult && contentResult.ok) {
                console.log(`Retrieved body content for email ${emailObj.subject}, length: ${contentResult.body.length}`);
                console.log(`Body content preview: ${contentResult.body.substring(0, 50)}...`);
                emailObj.body = contentResult.body || '';
              } else {
                console.warn(`Failed to get body content for email: ${emailObj.subject}`, contentResult?.error || 'unknown error');
              }
              
              // Add to context
              ContextManager.emailContext.push(emailObj);
              addedCount++;
            } catch (emailErr) {
              console.error(`Error processing email ${emailObj.subject}:`, emailErr);
              // Still add the email but without body content
              ContextManager.emailContext.push(emailObj);
              addedCount++;
            }
          }
        } finally {
          console.log(`Added ${addedCount} emails, skipped ${skippedCount} duplicates`);
          if (addedCount > 0) {
            contextAdded = true;
            ContextManager.updateContextUI(); // Update UI after adding all emails
          }
        }
      })();
    } catch (e) {
      console.error('Error parsing selected emails from URL:', e);
    }
  }
  
  // Always update UI with whatever context we have
  ContextManager.updateContextUI();
  
  // If no URL parameters were found, try background script after a short delay
  // This delay ensures async operations from URL params have a chance to set the flag
  if (!window.contextLoaded) {
    setTimeout(() => {
      if (window.contextLoaded) {
        console.log('Context already loaded, skipping background script request');
        return;
      }
      
      console.log('No context found in URL, requesting from background script...');
      window.contextLoaded = true; // Mark as loaded to prevent duplicates
      
      // As a fallback, try to get context from background script
      browser.runtime.sendMessage({ type: 'getContextForChat' }).then(async (ctx) => {
      console.log('Got context response:', ctx);
      let ctxAdded = false;
      
      // Add current email first if available
      if (ctx && ctx.currentEmail) {
        console.log('Adding current email to context:', ctx.currentEmail.subject);
        
        // Create email object with isPrimary flag
        const emailObj = {
          id: ctx.currentEmail.id,
          subject: ctx.currentEmail.subject,
          author: ctx.currentEmail.author,
          date: ctx.currentEmail.date,
          body: '', // Will be filled asynchronously
          isPrimary: true
        };
        
        // Initialize tracking set if needed
        window.addedEmailIds = window.addedEmailIds || new Set();
        
        // First check if we already added this email or if it's in the context
        if (window.addedEmailIds.has(ctx.currentEmail.id)) {
          console.log(`Email ID ${ctx.currentEmail.id} from background script already being processed`);
        }
        // Then check if it's already in the context
        else if (ContextManager.isItemDuplicate(emailObj, 'email')) {
          console.log(`Email from background script already exists in context: ${emailObj.subject}`);
        } else {
          // Add to tracking set
          window.addedEmailIds.add(ctx.currentEmail.id);
          // Get the message content
          try {
            const contentResult = await browser.runtime.sendMessage({
              type: 'getMessageContent',
              messageId: ctx.currentEmail.id
            });
            
            if (contentResult && contentResult.ok) {
              console.log(`Retrieved body content for current email, length: ${contentResult.body.length}`);
              emailObj.body = contentResult.body || '';
            }
          } catch (err) {
            console.error('Error getting body content for current email:', err);
          }
          
          // Add to context
          ContextManager.emailContext.push(emailObj);
          ctxAdded = true;
        }
      }
      
      // Then add selected emails with duplicate checking
      if (ctx && ctx.selectedEmails && ctx.selectedEmails.length > 0) {
        console.log('Adding selected emails to context:', ctx.selectedEmails.length);
        
        let addedCount = 0;
        let skippedCount = 0;
        let emailsToProcess = [];
        
        ctx.selectedEmails.forEach(email => {
          // Create email object
          const emailObj = {
            id: email.id,
            subject: email.subject,
            author: email.author,
            date: email.date,
            body: '' // Initialize with empty body, will be filled asynchronously
          };
          
          // Initialize tracking set if needed
          window.addedEmailIds = window.addedEmailIds || new Set();
          
          // Check if we already added this email ID
          if (window.addedEmailIds.has(email.id)) {
            console.log(`Skipping duplicate email with ID ${email.id}: ${email.subject} - already being processed`);
            skippedCount++;
          }
          // Check if it's already in the context
          else if (ContextManager.isItemDuplicate(emailObj, 'email')) {
            console.log(`Skipping duplicate email: ${email.subject} - already in context`);
            skippedCount++;
          } else {
            // Add to tracking set
            window.addedEmailIds.add(email.id);
            emailsToProcess.push(emailObj);
          }
        });
        
        // Process each non-duplicate email to get its content
        for (const emailObj of emailsToProcess) {
          try {
            // Get full message content
            const contentResult = await browser.runtime.sendMessage({
              type: 'getMessageContent',
              messageId: emailObj.id
            });
            
            // Add the body content if available
            if (contentResult && contentResult.ok) {
              console.log(`Retrieved body content for email ${emailObj.subject}, length: ${contentResult.body.length}`);
              emailObj.body = contentResult.body || '';
            }
            
            // Add to context
            ContextManager.emailContext.push(emailObj);
            addedCount++;
          } catch (err) {
            console.error(`Error getting body content for email ${emailObj.subject}:`, err);
            // Still add the email even without body content
            ContextManager.emailContext.push(emailObj);
            addedCount++;
          }
        }
        
        console.log(`Added ${addedCount} emails, skipped ${skippedCount} duplicates`);
        if (addedCount > 0) ctxAdded = true;
      }
      
      // Update the UI after all context is added
      if (ctxAdded) {
        ContextManager.updateContextUI();
        console.log('Context updated from background script');
      } else {
        console.log('No context added from background script');
      }
    }).catch(err => {
      console.error('Error getting context:', err);
    });
  }, 100); // End of setTimeout - use 100ms delay to ensure URL params are processed first
  }
}

if (isEditDraft) {
  // Hide quick actions
  const quickActions = document.querySelector('.quick-actions');
  if (quickActions) quickActions.style.display = 'none';
  // Prefill chat with draft and prompt
  UIComponents.addMessageToChat(chatMessages, 'system', 'Editing current draft:');
  UIComponents.addMessageToChat(chatMessages, 'user', draftPrompt, [{ label: 'Draft', icon: '✉️', fullLabel: 'Draft being edited' }]);
  // Enable edit draft tool if requested
  if (editDraftTool) {
    AIIntegration.toolState.draftEmail = true;
  }
  // Call AI and show answer
  (async () => {
    sendBtn.disabled = true;
    UIComponents.showLoading(chatMessages);
    try {
      // Use the same logic as AIIntegration.sendMessage, but with draftBody as context
      const settings = await browser.storage.local.get('openaiApiKey');
      const apiKey = settings.openaiApiKey;
      if (!apiKey) throw new Error('API key not found');
      let systemPrompt = `You are an AI assistant helping edit an email draft. The current draft is below. Apply the user's edit request to the draft and return the improved draft only.\n\nCURRENT DRAFT:\n${draftBody}`;
      const fullPrompt = systemPrompt + '\n\nUSER REQUEST:\n' + draftPrompt;
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
      UIComponents.removeLoading();
      let aiResponse = data.choices?.[0]?.message?.content || 'No response received';
      // Show Copilot answer and action buttons
      UIComponents.addMessageToChat(chatMessages, 'assistant', aiResponse);
      // Add action buttons below
      const actionsDiv = document.createElement('div');
      actionsDiv.style.margin = '16px 0 0 0';
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '12px';
      const useBtn = document.createElement('button');
      useBtn.textContent = 'Use this answer';
      useBtn.style.background = '#4b8bf4';
      useBtn.style.color = 'white';
      useBtn.style.border = 'none';
      useBtn.style.borderRadius = '3px';
      useBtn.style.padding = '6px 16px';
      useBtn.style.cursor = 'pointer';
      const diffBtn = document.createElement('button');
      diffBtn.textContent = 'Show changes';
      diffBtn.style.background = '#eee';
      diffBtn.style.color = '#333';
      diffBtn.style.border = '1px solid #bbb';
      diffBtn.style.borderRadius = '3px';
      diffBtn.style.padding = '6px 16px';
      diffBtn.style.cursor = 'pointer';
      actionsDiv.appendChild(useBtn);
      actionsDiv.appendChild(diffBtn);
      chatMessages.appendChild(actionsDiv);
      // Use this answer: post message to parent
      useBtn.addEventListener('click', async () => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'copilot-overwrite-draft', newBody: aiResponse }, '*');
        } else {
          await browser.runtime.sendMessage({ type: 'overwriteDraftWithCopilot', newBody: aiResponse });
          window.close();
        }
      });
      // Show changes: show diff
      diffBtn.addEventListener('click', () => {
        const orig = draftBody.split('\n');
        const edit = aiResponse.split('\n');
        let diff = '';
        for (let i = 0; i < Math.max(orig.length, edit.length); i++) {
          if (orig[i] !== edit[i]) {
            diff += `- ${orig[i] || ''}\n+ ${edit[i] || ''}\n`;
          } else {
            diff += `  ${orig[i] || ''}\n`;
          }
        }
        const diffDiv = document.createElement('pre');
        diffDiv.textContent = diff;
        diffDiv.style.background = '#f8f8f8';
        diffDiv.style.border = '1px solid #eee';
        diffDiv.style.padding = '8px';
        diffDiv.style.borderRadius = '4px';
        diffDiv.style.marginTop = '12px';
        chatMessages.appendChild(diffDiv);
        diffBtn.disabled = true;
      });
    } catch (error) {
      UIComponents.removeLoading();
      UIComponents.addMessageToChat(chatMessages, 'assistant', `❌ Error: ${error.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  })();
  // Hide input area for edit draft mode
  document.querySelector('.input-container').style.display = 'none';
}

// --- TOOL DROPDOWN LOGIC (Checklist) ---
addToolBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = toolDropdown.style.display === 'block';
  if (isVisible) {
    toolDropdown.style.display = 'none';
  } else {
    // Always position dropdown upwards for consistency
    toolDropdown.classList.add('dropdown-up');
    toolDropdown.style.display = 'block';
  }
});

// Close tool dropdown when clicking outside
document.addEventListener('click', () => {
  toolDropdown.style.display = 'none';
});

// Prevent dropdown from closing when clicking inside
toolDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Tool checklist logic
const toolCheckboxes = toolDropdown.querySelectorAll('.tool-checkbox');
toolCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const tool = checkbox.value;
    if (checkbox.checked) {
      if (!enabledTools.includes(tool)) enabledTools.push(tool);
    } else {
      enabledTools = enabledTools.filter(t => t !== tool);
    }
    // Update tool state for AIIntegration
    if (tool === 'draftEmail') AIIntegration.toolState.draftEmail = checkbox.checked;
    updateToolCounterBadge();
  });
});

function updateToolCounterBadge() {
  if (toolCounterBadge) {
    const count = enabledTools.length;
    if (count > 0) {
      toolCounterBadge.textContent = count;
      toolCounterBadge.style.display = 'block';
    } else {
      toolCounterBadge.style.display = 'none';
    }
  }
}

// On load, sync checkboxes and badge
function syncToolChecklistUI() {
  const toolCheckboxes = toolDropdown.querySelectorAll('.tool-checkbox');
  toolCheckboxes.forEach(checkbox => {
    checkbox.checked = enabledTools.includes(checkbox.value);
  });
  updateToolCounterBadge();
}

// If tools are set programmatically, call syncToolChecklistUI()
// (e.g., after AIIntegration/toolState changes)

// Optionally, expose enabledTools for other modules
window.getEnabledTools = () => [...enabledTools];

// Debug mode toggle
let debugMode = false;
const debugButton = document.createElement('button');
debugButton.textContent = 'Debug';
debugButton.className = 'debug-btn';
debugButton.style.display = 'none';
debugButton.style.position = 'absolute';
debugButton.style.top = '10px';
debugButton.style.right = '10px';
debugButton.style.zIndex = '100';
debugButton.style.background = '#f44336';
debugButton.style.color = 'white';
debugButton.style.border = 'none';
debugButton.style.borderRadius = '4px';
debugButton.style.padding = '4px 8px';
debugButton.style.fontSize = '12px';
debugButton.style.cursor = 'pointer';
debugButton.addEventListener('click', () => {
  const url = browser.runtime.getURL('debug.html');
  browser.windows.create({ url, type: 'popup', width: 900, height: 700 });
});

// Check for debug mode setting
browser.storage.local.get('debugMode').then(result => {
  if (result && result.debugMode) {
    debugMode = true;
    debugButton.style.display = 'block';
  }
});

// When DOM is fully loaded, add the debug button
document.addEventListener('DOMContentLoaded', () => {
  document.body.appendChild(debugButton);
});

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
    // Show loading indicator
    contextDropdown.innerHTML = '<div style="padding: 10px; text-align: center;">Checking available context...</div>';
    
    // Always position dropdown upwards
    contextDropdown.classList.add('dropdown-up');
    contextDropdown.style.display = 'block';
    
    // Check for available context options
    if (typeof ContextManager !== 'undefined') {
      try {
        // First restore the original menu structure
        contextDropdown.innerHTML = `
          <div id="addCurrentEmail" class="context-option">
            <span class="material-icons">mail</span>
            <span>Current Email</span>
          </div>
          <div id="addSelectedEmails" class="context-option">
            <span class="material-icons">mark_email_read</span>
            <span>Selected Emails</span>
          </div>
          <div id="addTextSelection" class="context-option">
            <span class="material-icons">text_snippet</span>
            <span>Selected Text</span>
          </div>
          <div id="addContacts" class="context-option">
            <span class="material-icons">contacts</span>
            <span>Contacts</span>
          </div>
          <div id="browseEmails" class="context-option">
            <span class="material-icons">email</span>
            <span>Browse Emails</span>
          </div>
          <div id="noContextOptionsMsg" class="context-option" style="display:none; font-style:italic; color:#666; text-align:center;">
            No context options available
          </div>
        `;
        
        // Attach event listeners to the menu items
        document.getElementById('addCurrentEmail').addEventListener('click', async (e) => {
          // Check if this element is disabled (by CSS opacity/cursor)
          if (e.currentTarget.style.opacity === '0.6') {
            // Item is disabled, do nothing
            return;
          }
          await ContextManager.addCurrentEmail();
          Utils.closeContextDropdown(contextDropdown);
        });
        
        document.getElementById('addSelectedEmails').addEventListener('click', async (e) => {
          // Check if this element is disabled (by CSS opacity/cursor)
          if (e.currentTarget.style.opacity === '0.6') {
            // Item is disabled, do nothing
            return;
          }
          await ContextManager.addSelectedEmails();
          Utils.closeContextDropdown(contextDropdown);
        });
        
        document.getElementById('addTextSelection').addEventListener('click', async () => {
          await ContextManager.addTextSelection();
          Utils.closeContextDropdown(contextDropdown);
        });
        
        document.getElementById('addContacts').addEventListener('click', async () => {
          await ContextManager.addContacts();
          Utils.closeContextDropdown(contextDropdown);
        });
        
        document.getElementById('browseEmails').addEventListener('click', async () => {
          Utils.logger.debug('Opening email browser');
          Utils.closeContextDropdown(contextDropdown);
          await ContextManager.showEmailBrowser();
        });
        
        // Now update the visibility of each option
        await ContextManager.updateContextDropdownVisibility();
      } catch (error) {
        console.error('Error updating context dropdown visibility:', error);
        contextDropdown.innerHTML = '<div style="padding: 10px; color: red;">Error loading context options</div>';
      }
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