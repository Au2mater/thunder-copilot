
const ContextManager = {
// context-manager.js - Manages all context-related functionality
  emailContext: [],
  contactsContext: [],
  textSelectionContext: [],
  
  // DOM references (will be set by main index.js)
  contextText: null,
  chatMessages: null,
  addSelectedEmailsBtn: null,
  contextPillsInline: null,


  // Initialize with DOM references
  init: function(domRefs) {
    this.contextText = domRefs.contextText;
    this.chatMessages = domRefs.chatMessages;
    this.addSelectedEmailsBtn = domRefs.addSelectedEmailsBtn;
    this.contextPillsInline = domRefs.contextPillsInline;
  },

  // Show/hide context dropdown options based on current state
  updateContextDropdownVisibility: async function() {
    // Selected Text
    let hasSelection = false;
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const results = await browser.tabs.executeScript(tabs[0].id, {
          code: 'window.getSelection && window.getSelection().toString().trim().length > 0'
        });
        hasSelection = results && results[0];
      }
    } catch (e) { hasSelection = false; }
    const addTextSelection = document.getElementById('addTextSelection');
    if (addTextSelection) addTextSelection.style.display = hasSelection ? 'block' : 'none';

    // Current Email
    let hasCurrentEmail = false;
    try {
      const r = await browser.runtime.sendMessage({ type: 'getDisplayedMessage' });
      hasCurrentEmail = r && r.ok && r.message;
    } catch (e) { hasCurrentEmail = false; }
    const addCurrentEmail = document.getElementById('addCurrentEmail');
    if (addCurrentEmail) addCurrentEmail.style.display = hasCurrentEmail ? 'block' : 'none';

    // Selected Emails
    let hasSelectedEmails = false;
    try {
      const r = await browser.runtime.sendMessage({ type: 'getSelectedEmails' });
      hasSelectedEmails = r && r.ok && r.messages && r.messages.length > 0;
    } catch (e) { hasSelectedEmails = false; }
    const addSelectedEmails = document.getElementById('addSelectedEmails');
    if (addSelectedEmails) addSelectedEmails.style.display = hasSelectedEmails ? 'block' : 'none';

    // Contacts
    let hasContacts = false;
    try {
      const r = await browser.runtime.sendMessage({ type: 'getContacts' });
      hasContacts = r && r.ok && r.contacts && r.contacts.length > 0;
    } catch (e) { hasContacts = false; }
    const addContacts = document.getElementById('addContacts');
    if (addContacts) addContacts.style.display = hasContacts ? 'block' : 'none';
  },

  // Update context indicator UI and render pills
  updateContextUI: function() {
    // Just render inline context pills (no "No context" text needed)
    this.renderContextPillsInline();
  },

  // Render context pills inline in the input header
  renderContextPillsInline: function() {
    // Pills are now rendered as direct siblings to the button in .context-btn-container
    const btnContainer = document.getElementById('contextBtnContainer');
    if (!btnContainer) return;

    // Remove all existing pills (but not the button or dropdown)
    Array.from(btnContainer.querySelectorAll('.context-pill-inline')).forEach(el => el.remove());

    // Find the button (should always be first)
    const addBtn = btnContainer.querySelector('.add-context-btn');
    let insertAfter = addBtn;

    // Render email pills
    this.emailContext.forEach((email, index) => {
      const subject = email.subject || '(No Subject)';
      const truncatedSubject = subject.length > 8 ? subject.substring(0, 8) + '...' : subject;
      const pill = this.createContextPillInline(
        'email',
        truncatedSubject,
        () => this.removeEmail(index)
      );
      pill.title = `Email: ${subject}`;
      insertAfter.insertAdjacentElement('afterend', pill);
      insertAfter = pill;
    });

    // Render contacts pill (single pill for all contacts)
    if (this.contactsContext.length > 0) {
      const contactText = `${this.contactsContext.length} contact${this.contactsContext.length > 1 ? 's' : ''}`;
      const pill = this.createContextPillInline(
        'contacts',
        contactText,
        () => this.removeContacts()
      );
      pill.title = `Contacts: ${contactText}`;
      insertAfter.insertAdjacentElement('afterend', pill);
      insertAfter = pill;
    }

    // Render text selection pills
    this.textSelectionContext.forEach((selection, index) => {
      const shortText = selection.text.length > 8 ? 
        selection.text.substring(0, 8) + '...' : 
        selection.text;
      const pill = this.createContextPillInline(
        'selection',
        `"${shortText}"`,
        () => this.removeTextSelection(index)
      );
      pill.title = `Selection: "${selection.text}" from ${selection.source}`;
      insertAfter.insertAdjacentElement('afterend', pill);
      insertAfter = pill;
    });
  },

  // Create an inline context pill element (smaller version)
  createContextPillInline: function(type, label, onRemove) {
    const pill = document.createElement('div');
    pill.className = `context-pill-inline pill-${type}`;
    
    const icon = document.createElement('span');
    icon.className = 'material-icons context-pill-inline-icon';
    icon.style.fontSize = '16px';
    if (type === 'email') {
      icon.textContent = 'mail';
    } else if (type === 'contacts') {
      icon.textContent = 'contacts';
    } else {
      icon.textContent = 'text_snippet';
    }
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'context-pill-inline-label';
    labelSpan.textContent = label;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'context-pill-inline-remove';
    removeBtn.title = 'Remove from context';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.padding = '0';
    removeBtn.style.marginLeft = '2px';
    removeBtn.style.cursor = 'pointer';
    const removeIcon = document.createElement('span');
    removeIcon.className = 'material-icons';
    removeIcon.style.fontSize = '16px';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove();
    });
    
    pill.appendChild(icon);
    pill.appendChild(labelSpan);
    pill.appendChild(removeBtn);
    
    return pill;
  },

  // Remove specific email from context
  removeEmail: function(index) {
    if (index >= 0 && index < this.emailContext.length) {
      const removedEmail = this.emailContext.splice(index, 1)[0];
      this.updateContextUI();
      Utils.logger.info('Email removed from context:', removedEmail.subject);
    }
  },

  // Remove all contacts from context
  removeContacts: function() {
    if (this.contactsContext.length > 0) {
      const count = this.contactsContext.length;
      this.contactsContext = [];
      this.updateContextUI();
      Utils.logger.info('Contacts removed from context:', count);
    }
  },

  // Remove specific text selection from context
  removeTextSelection: function(index) {
    if (index >= 0 && index < this.textSelectionContext.length) {
      const removedSelection = this.textSelectionContext.splice(index, 1)[0];
      this.updateContextUI();
      Utils.logger.info('Text selection removed from context:', removedSelection.text.substring(0, 50));
    }
  },

  // Get current context as tags for message attachment
  getCurrentContextTags: function() {
    const tags = [];
    
    // Add email tags
    this.emailContext.forEach(email => {
      const subject = email.subject || '(No Subject)';
      const truncatedSubject = subject.length > 10 ? subject.substring(0, 10) + '...' : subject;
      tags.push({
        type: 'email',
        label: truncatedSubject,
        fullLabel: subject,
        icon: '✉'
      });
    });
    
    // Add contacts tag
    if (this.contactsContext.length > 0) {
      const contactText = `${this.contactsContext.length} contact${this.contactsContext.length > 1 ? 's' : ''}`;
      tags.push({
        type: 'contacts',
        label: contactText,
        fullLabel: contactText,
        icon: '⚇'
      });
    }
    
    // Add text selection tags
    this.textSelectionContext.forEach(selection => {
      const shortText = selection.text.length > 10 ? 
        selection.text.substring(0, 10) + '...' : 
        selection.text;
      tags.push({
        type: 'selection',
        label: `"${shortText}"`,
        fullLabel: `"${selection.text}" from ${selection.source}`,
        icon: '▢'
      });
    });
    
    return tags;
  },

  // Clear all context after message is sent
  clearAllContext: function() {
    this.emailContext = [];
    this.contactsContext = [];
    this.textSelectionContext = [];
    this.updateContextUI();
    Utils.logger.info('All context cleared after message sent');
  },

  // Check for selected emails and show/hide the option
  updateSelectedEmailsVisibility: async function() {
    try {
      Utils.logger.debug('Checking for selected emails...');
      const result = await browser.runtime.sendMessage({ type: 'getSelectedEmails' });
      
      if (result && result.ok && result.messages && result.messages.length > 0) {
        Utils.logger.debug('Found selected emails:', result.messages.length);
        this.addSelectedEmailsBtn.style.display = 'block';
        
        // Update the button text to show count
        const count = result.messages.length;
        this.addSelectedEmailsBtn.textContent = `Selected emails (${count})`;
      } else {
        Utils.logger.debug('No emails selected');
        this.addSelectedEmailsBtn.style.display = 'none';
      }
    } catch (error) {
      Utils.logger.error('Error checking selected emails:', error);
      this.addSelectedEmailsBtn.style.display = 'none';
    }
  },

  // Add current email to context
  addCurrentEmail: async function() {
    try {
      Utils.logger.debug('Adding current email to context');
      const r = await browser.runtime.sendMessage({ type: 'getDisplayedMessage' });
      
      if (r.ok) {
        const m = r.message;
        // Check if already in context
        const exists = this.emailContext.some(e => e.id === m.id);
        
        if (!exists) {
          this.emailContext.push({
            id: m.id,
            subject: m.subject,
            author: m.author,
            date: m.date,
            body: m.parts?.map(p => p.body || '').join('\n') || ''
          });
          
          this.updateContextUI();
          Utils.logger.info('Email added to context:', m.subject);
        } else {
          Utils.logger.warn('Email already in context:', m.subject);
        }
      } else {
        Utils.logger.warn('Failed to add email to context:', r.error);
      }
    } catch (error) {
      Utils.logger.error('Error adding current email to context:', error);
    }
  },

  // Add contacts to context
  addContacts: async function() {
    try {
      Utils.logger.debug('Adding contacts to context');
      const r = await browser.runtime.sendMessage({ type: 'getContacts' });
      
      if (r.ok) {
        this.contactsContext = r.contacts;
        this.updateContextUI();
        Utils.logger.info('Contacts added to context:', this.contactsContext.length);
      } else {
        Utils.logger.warn('Failed to add contacts to context:', r.error);
      }
    } catch (error) {
      Utils.logger.error('Error adding contacts to context:', error);
    }
  },

  // Add text selection to context
  addTextSelection: async function() {
    try {
      Utils.logger.debug('Adding text selection to context');
      
      // Get the active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      
      if (!tabs || tabs.length === 0) {
        UIComponents.addMessageToChat(this.chatMessages, 'system', '❌ No active tab found');
        return;
      }
      
      const activeTab = tabs[0];
      Utils.logger.debug('Active tab:', activeTab.id, activeTab.type);
      
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
          
          this.textSelectionContext.push(selectionData);
          this.updateContextUI();
          
          Utils.logger.info('Text selection added to context:', result.selectedText.substring(0, 50) + '...');
        } else {
          Utils.logger.warn('No text selected:', result.error);
        }
      } else {
        Utils.logger.error('Failed to execute selection script');
      }
    } catch (error) {
      Utils.logger.error('Error adding text selection to context:', error);
    }
  },

  // Add selected emails to context
  addSelectedEmails: async function() {
    try {
      Utils.logger.debug('Adding selected emails to context');
      
      const result = await browser.runtime.sendMessage({ type: 'getSelectedEmails' });
      
      if (!result || !result.ok) {
        return;
      }
      
      const selectedEmails = result.messages || [];
      
      if (selectedEmails.length === 0) {
        return;
      }
      
      Utils.logger.info('Processing selected emails:', selectedEmails.length);
      
      // Get full content for each selected email
      const emailsWithContent = [];
      for (const email of selectedEmails) {
        try {
          const contentResult = await browser.runtime.sendMessage({
            type: 'getMessageContent',
            messageId: email.id
          });
          
          emailsWithContent.push({
            id: email.id,
            subject: email.subject,
            author: email.author,
            date: email.date,
            body: contentResult.ok ? contentResult.body : ''
          });
        } catch (error) {
          Utils.logger.error('Error getting content for email:', email.id, error);
          // Add email without content
          emailsWithContent.push({
            id: email.id,
            subject: email.subject,
            author: email.author,
            date: email.date,
            body: ''
          });
        }
      }
      
      // Add to context
      if (this.emailContext.length > 0) {
        this.emailContext.push(...emailsWithContent);
      } else {
        this.emailContext = emailsWithContent;
      }
      
      this.updateContextUI();
      
    } catch (error) {
      Utils.logger.error('Error adding selected emails to context:', error);
    }
  },

  // Show email browser modal for multiple email selection
  showEmailBrowser: async function() {
    const { overlay, modal, closeModal } = UIComponents.createModal('Select Emails for Context');
    
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
    const updateSelectedCount = () => {
      selectedCount.textContent = `${selectedEmails.length} email${selectedEmails.length !== 1 ? 's' : ''} selected`;
      addSelectedBtn.disabled = selectedEmails.length === 0;
      if (selectedEmails.length === 0) {
        addSelectedBtn.style.background = '#ccc';
        addSelectedBtn.style.cursor = 'not-allowed';
      } else {
        addSelectedBtn.style.background = '#28a745';
        addSelectedBtn.style.cursor = 'pointer';
      }
    };
    
    // Function to load and display emails
    const loadEmails = async (searchQuery = '') => {
      try {
        emailList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading emails...</div>';
        
        // Search for emails
        const query = searchQuery ? { subject: searchQuery } : {};
        const result = await browser.runtime.sendMessage({ 
          type: 'searchMessages', 
          query: query 
        });
        
        if (result.ok) {
          const emails = result.messages?.slice(0, 50) || []; // Limit to 50 results
          
          if (emails.length === 0) {
            emailList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No emails found</div>';
            return;
          }
          
          emailList.innerHTML = '';
          
          emails.forEach(email => {
            const emailItem = document.createElement('div');
            emailItem.style.cssText = `
              padding: 12px;
              border: 1px solid #e1e5e9;
              border-radius: 6px;
              margin-bottom: 8px;
              cursor: pointer;
              transition: all 0.2s;
            `;
            
            emailItem.innerHTML = `
              <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">${Utils.escapeHtml(email.subject || '(No Subject)')}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 2px;">From: ${Utils.escapeHtml(email.author || 'Unknown')}</div>
              <div style="font-size: 12px; color: #999;">Date: ${email.date ? new Date(email.date).toLocaleDateString() : 'Unknown'}</div>
            `;
            
            emailItem.addEventListener('click', () => {
              const isSelected = selectedEmails.find(e => e.id === email.id);
              
              if (isSelected) {
                // Remove from selection
                selectedEmails = selectedEmails.filter(e => e.id !== email.id);
                emailItem.style.background = '#fff';
                emailItem.style.borderColor = '#e1e5e9';
              } else {
                // Add to selection
                selectedEmails.push(email);
                emailItem.style.background = '#e3f2fd';
                emailItem.style.borderColor = '#2196f3';
              }
              
              updateSelectedCount();
            });
            
            emailItem.addEventListener('mouseenter', () => {
              if (!selectedEmails.find(e => e.id === email.id)) {
                emailItem.style.background = '#f8f9fa';
              }
            });
            
            emailItem.addEventListener('mouseleave', () => {
              if (!selectedEmails.find(e => e.id === email.id)) {
                emailItem.style.background = '#fff';
              }
            });
            
            emailList.appendChild(emailItem);
          });
        } else {
          emailList.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">Error: ${result.error}</div>`;
        }
      } catch (error) {
        Utils.logger.error('Error loading emails:', error);
        emailList.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">Error: ${error.message}</div>`;
      }
    };
    
    // Search functionality
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadEmails(searchInput.value.trim());
      }, 300);
    });
    
    // Add selected emails handler
    addSelectedBtn.addEventListener('click', async () => {
      if (selectedEmails.length === 0) return;
      try {
        // Get full email content for selected emails
        for (const email of selectedEmails) {
          try {
            const contentResult = await browser.runtime.sendMessage({
              type: 'getMessageContent',
              messageId: email.id
            });
            const body = contentResult.ok ? contentResult.body : '';
            // Check if already in context
            const idx = this.emailContext.findIndex(e => e.id === email.id);
            if (idx !== -1) {
              // Update body if missing or empty
              if (!this.emailContext[idx].body) {
                this.emailContext[idx].body = body;
              }
            } else {
              this.emailContext.push({
                id: email.id,
                subject: email.subject,
                author: email.author,
                date: email.date,
                body
              });
            }
          } catch (error) {
            Utils.logger.error('Error getting content for email:', email.id, error);
            // Add email without content if not already present
            const idx = this.emailContext.findIndex(e => e.id === email.id);
            if (idx === -1) {
              this.emailContext.push({
                id: email.id,
                subject: email.subject,
                author: email.author,
                date: email.date,
                body: ''
              });
            }
          }
        }
        this.updateContextUI();
        closeModal();
      } catch (error) {
        Utils.logger.error('Error adding emails to context:', error);
      }
    });
    
    // Build modal
    selectedContainer.appendChild(selectedCount);
    selectedContainer.appendChild(addSelectedBtn);
    
    modal.appendChild(searchContainer);
    modal.appendChild(emailList);
    modal.appendChild(selectedContainer);
    
    document.body.appendChild(overlay);
    
    // Load initial emails
    await loadEmails();
  },

  // Build context content for AI prompts
  buildContextContent: function() {
    let contextContent = '';
    
    if (this.emailContext.length > 0) {
      contextContent = 'Here are the emails to analyze:\n\n';
      this.emailContext.forEach((email, idx) => {
        contextContent += `Email ${idx + 1}:\nSubject: ${email.subject}\nFrom: ${email.author}\nDate: ${email.date}\nBody: ${email.body}\n\n`;
      });
      contextContent += '--- End of emails ---\n\n';
    }
    
    if (this.contactsContext.length > 0) {
      contextContent += 'Here are your contacts for email suggestions:\n\n';
      this.contactsContext.forEach((contact, idx) => {
        contextContent += `${idx + 1}. ${contact.name} - ${contact.email}\n`;
      });
      contextContent += `\n--- End of contacts (${this.contactsContext.length} total) ---\n\n`;
    }
    
    if (this.textSelectionContext.length > 0) {
      contextContent += 'Here are text selections for reference:\n\n';
      this.textSelectionContext.forEach((selection, idx) => {
        contextContent += `Selection ${idx + 1} from "${selection.source}":\n`;
        contextContent += `"${selection.text}"\n`;
        if (selection.context) {
          contextContent += `Context: ${selection.context}\n`;
        }
        contextContent += `\n`;
      });
      contextContent += '--- End of text selections ---\n\n';
    }
    
    return contextContent;
  }
};

