// ai-integration.js - OpenAI API communication and draft handling

const AIIntegration = {
  isApiKeyValid: false,
  chatMessages: null,

  // Initialize with DOM references
  init: function (domRefs) {
    this.chatMessages = domRefs.chatMessages;
  },

  // Check API key on startup and show/hide warning
  checkApiKey: async function (apiWarning) {
    try {
      const settings = await browser.storage.local.get('openaiApiKey');
      this.isApiKeyValid = !!(settings.openaiApiKey && settings.openaiApiKey.trim());

      if (this.isApiKeyValid) {
        apiWarning.style.display = 'none';
        Utils.logger.info('API key found');
      } else {
        apiWarning.style.display = 'block';
        Utils.logger.warn('No API key configured');
      }
    } catch (error) {
      Utils.logger.error('Error checking API key:', error);
      this.isApiKeyValid = false;
      apiWarning.style.display = 'block';
    }
  },

  // Tool state (should be managed by UI/tool manager)
  toolState: {
    draftEmail: false // Set to true if user adds the Draft Email tool
  },

  // Send message to AI
  sendMessage: async function (userMessage, sendBtn) {
    if (!userMessage.trim()) {
      Utils.logger.warn('Empty message provided');
      return;
    }

    if (!this.isApiKeyValid) {
      Utils.logger.warn('No API key configured');
      UIComponents.addMessageToChat(this.chatMessages, 'system', '⚠ Please set your OpenAI API key in Options to use AI features');
      return;
    }

    // Get current context tags before clearing
    const contextTags = ContextManager.getCurrentContextTags();

    // Add user message to chat with context tags
    UIComponents.addMessageToChat(this.chatMessages, 'user', userMessage, contextTags);

    // Build context content for AI request (before clearing)
    const contextContent = ContextManager.buildContextContent();

    // Clear context immediately after user message is sent
    ContextManager.clearAllContext();

    // Show loading
    UIComponents.showLoading(this.chatMessages);
    sendBtn.disabled = true;

    try {
      Utils.logger.info('Making OpenAI request with context');

      // Get fresh API key
      const settings = await browser.storage.local.get('openaiApiKey');
      const apiKey = settings.openaiApiKey;

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Base system prompt
      let systemPrompt = `You are an AI assistant helping with email management. You can:
1. Analyze emails and provide summaries
2. Suggest email improvements`;

      // If Draft Email tool is enabled, append drafting instructions
      if (this.toolState.draftEmail) {
        systemPrompt += `\n\nYou can also draft new emails based on user requests.\nWhen the user asks you to draft, compose, or write an email, respond with a structured format:\nEMAIL_DRAFT:\nTO: [recipient email(s)]\nSUBJECT: [email subject]\nBODY:\n[email body content]\n\nFor other requests, respond normally.`;
      }

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
        Utils.logger.error('OpenAI API error:', data.error);
        throw new Error(data.error.message || 'OpenAI API error');
      }

      const aiResponse = data.choices?.[0]?.message?.content || 'No response received';

      UIComponents.removeLoading();

      // Check if response contains an email draft
      if (aiResponse.includes('EMAIL_DRAFT:')) {
        const draftData = Utils.parseEmailDraft(aiResponse);
        if (draftData) {
          UIComponents.addMessageToChat(this.chatMessages, 'assistant', aiResponse);
          UIComponents.addDraftActions(this.chatMessages, draftData, this.createDraft.bind(this));
        } else {
          UIComponents.addMessageToChat(this.chatMessages, 'assistant', aiResponse);
        }
      } else {
        UIComponents.addMessageToChat(this.chatMessages, 'assistant', aiResponse);
      }

      Utils.logger.info('OpenAI request completed successfully');

    } catch (error) {
      Utils.logger.error('Error calling OpenAI:', error);
      UIComponents.removeLoading();
      UIComponents.addMessageToChat(this.chatMessages, 'assistant', `❌ Error: ${error.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  },

  // Create email draft and open for editing/sending
  createDraft: async function (draftData) {
    try {
      Utils.logger.info('Creating email draft with data:', draftData);
      // Check if compose API is available
      if (!browser.compose || typeof browser.compose.beginNew !== 'function') {
        UIComponents.addMessageToChat(this.chatMessages, 'system', '❌ Error: Compose API is not available in this environment.');
        Utils.logger.error('Compose API is not available.');
        return;
      }
      // Use compose API to open a new draft window with pre-filled data
      const result = await browser.compose.beginNew({
        to: draftData.to,
        subject: draftData.subject,
        body: draftData.body
      });
      if (result && result.id) {
        UIComponents.addMessageToChat(this.chatMessages, 'system', '✅ Email draft created and opened for editing!');
      } else {
        UIComponents.addMessageToChat(this.chatMessages, 'system', `❌ Error creating draft: Could not open compose window.`);
      }
    } catch (error) {
      Utils.logger.error('Error creating draft:', error);
      UIComponents.addMessageToChat(this.chatMessages, 'system', `❌ Error creating draft: ${error.message}`);
    }
  }
};

Utils.logger.info('AI Integration module loaded');