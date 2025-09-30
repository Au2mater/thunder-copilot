// ui-components.js - UI utilities and component creation

const UIComponents = {
  // Add message to chat (now supports context tags)
  addMessageToChat: function(chatMessages, type, content, contextTags = null) {
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
    
    // Add context tags if provided (for user messages)
    if (contextTags && contextTags.length > 0 && type === 'user') {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'message-tags';
      tagsContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
        opacity: 0.8;
      `;
      
      contextTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'message-tag';
        tagElement.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
        `;
        tagElement.title = tag.fullLabel; // Show full text on hover
        tagElement.innerHTML = `${tag.icon} ${tag.label}`;
        tagsContainer.appendChild(tagElement);
      });
      
      messageDiv.appendChild(tagsContainer);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  // Show loading message
  showLoading: function(chatMessages) {
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
  },

  // Remove loading message
  removeLoading: function() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
      loadingMessage.remove();
    }
  },

  // Show draft preview in a modal-like dialog
  showDraftPreview: function(draftData) {
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
  },

  // Add draft action buttons after AI response
  addDraftActions: function(chatMessages, draftData, onCreateDraft) {
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
    createButton.textContent = '✉ Create Draft';
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
      createButton.disabled = true;
      createButton.textContent = 'Creating...';
      
      try {
        await onCreateDraft(draftData);
      } finally {
        createButton.disabled = false;
        createButton.textContent = '✉ Create Draft';
      }
    });
    
    const previewButton = document.createElement('button');
    previewButton.textContent = '👁 Preview';
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
      UIComponents.showDraftPreview(draftData);
    });
    
    actionsDiv.appendChild(createButton);
    actionsDiv.appendChild(previewButton);
    
    chatMessages.appendChild(actionsDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  // Create modal overlay with header
  createModal: function(title, width = '90%', maxWidth = '600px') {
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
      width: ${width};
      max-width: ${maxWidth};
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
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = 'margin: 0; font-size: 16px; color: #333;';
    
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
    
    // Close handlers
    const closeModal = () => overlay.remove();
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    header.appendChild(titleElement);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    overlay.appendChild(modal);
    
    return { overlay, modal, closeModal };
  }
};

Utils.logger.info('UI Components module loaded');