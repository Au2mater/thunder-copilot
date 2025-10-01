// ai-integration.js - OpenAI API communication and draft handling

const AIIntegration = {
  isApiKeyValid: false,
  chatMessages: null,
  // Store conversation history for function calling
  conversationHistory: [],

  // Initialize with DOM references
  init: function (domRefs) {
    this.chatMessages = domRefs.chatMessages;
  },
  
  // Get centralized tool definitions for UI and function calling
  getToolDefinitions: function() {
    return this.tools.map(tool => {
      return {
        name: tool.id,
        displayName: tool.name,
        description: tool.description,
        icon: `<span class="material-icons">${tool.icon}</span>`,
        functionName: tool.functionName,
        functionDescription: tool.functionDescription,
        parameters: tool.parameters
      };
    });
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

  // Tool state (managed by UI through the tools dropdown)
  toolState: {
    draftEmail: false, // Create email drafts
    calendarEvent: false, // Create calendar events
    summarizeEmail: false  // Summarize emails
  },
  
  // Centralized tool definitions
  tools: [
    {
      id: 'draftEmail',
      name: 'Draft Email',
      icon: 'mail',
      description: 'Create new email drafts or generate replies',
      functionName: 'create_email_draft',
      functionDescription: 'Create a new email draft with specified recipients, subject, and body. Use this whenever the user asks to draft, compose, write an email, or create a shorter/condensed version of an email.',
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "array",
            items: { type: "string" },
            description: "Array of recipient email addresses"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content in plain text"
          }
        },
        required: ["subject", "body"]
      }
    },
    {
      id: 'calendarEvent',
      name: 'Calendar Event',
      icon: 'event',
      description: 'Schedule meetings or create calendar events',
      functionName: 'create_calendar_event',
      functionDescription: 'Create a calendar event or meeting invitation. Use this when the user wants to schedule a meeting or add an event to calendar.',
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the event"
          },
          startTime: {
            type: "string",
            description: "Start date and time in ISO format (YYYY-MM-DDTHH:MM:SS)"
          },
          endTime: {
            type: "string",
            description: "End date and time in ISO format (YYYY-MM-DDTHH:MM:SS)"
          },
          location: {
            type: "string",
            description: "Location of the event"
          },
          description: {
            type: "string",
            description: "Event details and description"
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "List of attendee email addresses"
          }
        },
        required: ["title", "startTime", "endTime"]
      }
    },
    {
      id: 'summarizeEmail',
      name: 'Email Summary',
      icon: 'summarize',
      description: 'Generate concise summaries of emails',
      functionName: 'summarize_email',
      functionDescription: 'Generate a concise summary of an email. Use this when the user asks for a summary of an email.',
      parameters: {
        type: "object",
        properties: {
          emailIndex: {
            type: "integer",
            description: "Index of the email to summarize from the provided context (1-based)"
          },
          length: {
            type: "string",
            enum: ["short", "medium", "long"],
            description: "Desired length of the summary"
          }
        },
        required: ["emailIndex"]
      }
    }
  ],

  // Define OpenAI function tools - return only the enabled tools
  getFunctionTools: function() {
    // Start with an empty array
    const enabledTools = [];
    
    // Add tools based on the toolState using our centralized definitions
    this.tools.forEach(tool => {
      if (this.toolState[tool.id]) {
        enabledTools.push({
          type: "function",
          function: {
            name: tool.functionName,
            description: tool.functionDescription,
            parameters: tool.parameters
          }
        });
      }
    });
    
    return enabledTools;
  },

  // Execute function calls based on AI response
  executeFunction: async function(functionCall) {
    Utils.logger.info('Executing function:', functionCall.name);
    
    try {
      // Add extra validation and parsing safety for function arguments
      let args;
      try {
        // Log the raw arguments for debugging
        Utils.logger.debug('Raw function arguments:', functionCall.arguments);
        
        // Parse the arguments
        args = JSON.parse(functionCall.arguments);
        
        // Log the parsed arguments
        Utils.logger.debug('Parsed function arguments:', JSON.stringify(args));
      } catch (parseError) {
        Utils.logger.error('Error parsing function arguments:', parseError);
        return { 
          success: false, 
          error: `Invalid function arguments: ${parseError.message}`
        };
      }
      
      // Validate the required arguments based on function
      let result = null;
      
      switch(functionCall.name) {
        case 'create_email_draft':
          // Basic validation for email draft
          if (!args.subject) {
            Utils.logger.warn('Missing required subject in create_email_draft');
            return { 
              success: false, 
              error: 'Subject is required for email drafts'
            };
          }
          
          if (!args.body) {
            Utils.logger.warn('Missing required body in create_email_draft');
            return { 
              success: false, 
              error: 'Body content is required for email drafts'
            };
          }
          
          Utils.logger.info('Executing create_email_draft with validated arguments');
          result = await this.executeCreateDraft({
            to: Array.isArray(args.to) ? args.to : (args.to ? [args.to] : []),
            subject: args.subject,
            body: args.body
          });
          break;
        
        case 'create_calendar_event':
          // Basic validation for calendar event
          if (!args.title || !args.startTime || !args.endTime) {
            Utils.logger.warn('Missing required fields in create_calendar_event');
            return { 
              success: false, 
              error: 'Title, startTime, and endTime are required for calendar events'
            };
          }
          
          result = await this.executeCreateCalendarEvent(args);
          break;
          
        case 'summarize_email':
          // Basic validation for email summarization
          if (typeof args.emailIndex !== 'number' || args.emailIndex < 1) {
            Utils.logger.warn('Invalid emailIndex in summarize_email');
            return { 
              success: false, 
              error: 'Valid emailIndex (1 or greater) is required for summarization'
            };
          }
          
          result = this.executeSummarizeEmail(args);
          break;
          
        default:
          Utils.logger.warn('Unknown function called:', functionCall.name);
          result = { 
            success: false,
            error: `Function ${functionCall.name} is not implemented`
          };
      }
      
      // Add default success status if not explicitly provided
      if (result && !result.hasOwnProperty('success')) {
        result.success = !result.error;
      }
      
      return result;
      
    } catch (error) {
      Utils.logger.error('Error executing function:', error);
      return { 
        success: false,
        error: error.message || 'Error executing function'
      };
    }
  },

  // Create email draft and return result for function call
  executeCreateDraft: async function(draftData) {
    try {
      Utils.logger.info('Creating email draft with data:', JSON.stringify(draftData));
      
      // Add detailed debugging
      Utils.logger.debug('Draft data - To: ' + JSON.stringify(draftData.to));
      Utils.logger.debug('Draft data - Subject: ' + draftData.subject);
      Utils.logger.debug('Draft data - Body length: ' + (draftData.body ? draftData.body.length : 0));
      
      // Always use the background script approach for consistent behavior
      Utils.logger.info('Using background script to create draft');
      
      try {
        const response = await browser.runtime.sendMessage({
          type: 'createDraftWithData',  // Changed the message type to be more specific
          draftData: {
            to: draftData.to || [],
            subject: draftData.subject || '',
            body: draftData.body || ''
          }
        });
        
        // Log the full response for debugging
        Utils.logger.debug('Background script response:', JSON.stringify(response));
        
        if (response && response.success) {
          Utils.logger.info('Draft created successfully via background script');
          UIComponents.addMessageToChat(this.chatMessages, 'system', '✅ Email draft created and opened for editing!');
          return {
            success: true,
            message: 'Email draft created successfully',
            draftId: response.draftId || 'unknown'
          };
        } else {
          const errorMsg = response?.error || 'Unknown error in background script';
          Utils.logger.error('Error from background script:', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (error) {
        Utils.logger.error('Error in runtime message:', error);
        
        // Final fallback: try direct API call
        Utils.logger.info('Fallback: attempting direct API call');
        
        if (!browser.compose || typeof browser.compose.beginNew !== 'function') {
          throw new Error('Compose API is not available');
        }
        
        const result = await browser.compose.beginNew({
          to: draftData.to || [],
          subject: draftData.subject || '',
          body: draftData.body || ''
        });
        
        if (result && result.id) {
          Utils.logger.info('Direct API call successful, compose ID:', result.id);
          UIComponents.addMessageToChat(this.chatMessages, 'system', '✅ Email draft created and opened for editing!');
          return { 
            success: true, 
            message: 'Email draft created successfully via direct API',
            draftId: result.id
          };
        } else {
          throw new Error('Direct API call failed to return a valid result');
        }
      }
    } catch (error) {
      Utils.logger.error('Error creating draft:', error);
      UIComponents.addMessageToChat(this.chatMessages, 'system', `❌ Error creating draft: ${error.message}`);
      return { 
        success: false, 
        error: error.message || 'Error creating email draft'
      };
    }
  },

  // Create calendar event
  executeCreateCalendarEvent: async function(eventData) {
    // This is a placeholder - actual calendar integration would be added here
    Utils.logger.info('Creating calendar event (placeholder):', eventData);
    
    // For now, let's just return a success response
    return {
      success: true,
      message: 'Calendar event creation would happen here (not yet implemented)',
      eventDetails: {
        title: eventData.title,
        startTime: eventData.startTime,
        endTime: eventData.endTime
      }
    };
  },

  // Summarize email based on index
  executeSummarizeEmail: function(args) {
    const emailIndex = args.emailIndex;
    const length = args.length || 'medium';
    
    if (!this.emailContext || emailIndex < 1 || emailIndex > this.emailContext.length) {
      return {
        success: false,
        error: `Email index ${emailIndex} is out of range or context is missing`
      };
    }
    
    const email = this.emailContext[emailIndex - 1];
    
    // Get potential reply email addresses
    const replyToAddresses = email.replyTo || [];
    
    return {
      success: true,
      emailSubject: email.subject,
      emailAuthor: email.author,
      replyTo: replyToAddresses,
      // The actual summarization will be done by the model itself
      // This just returns the email details to confirm we found the right one
      message: `Email found for summarization: ${email.subject}`
    };
  },

  // Send message to AI with function calling
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
    
    // Check if there are any enabled tools
    const hasEnabledTools = Object.values(this.toolState).some(enabled => enabled === true);
    if (!hasEnabledTools) {
      Utils.logger.info('No tools are enabled, using regular text response mode');
    }

    // Get current context tags before clearing
    const contextTags = ContextManager.getCurrentContextTags();

    // Add user message to chat with context tags
    UIComponents.addMessageToChat(this.chatMessages, 'user', userMessage, contextTags);

    // Build context content for AI request (before clearing)
    const contextContent = ContextManager.buildContextContent();
    
    // Store email context temporarily for function execution
    // Make a deep copy with additional properties needed for function execution
    this.emailContext = ContextManager.emailContext.map(email => {
      // Extract email addresses for potential reply
      let replyToAddresses = [];
      
      // Try to extract email address from the From/Author field if available
      if (email.author) {
        const emailMatch = email.author.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          replyToAddresses.push(emailMatch[0]);
        }
      }
      
      return {
        ...email,
        replyTo: replyToAddresses
      };
    });

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

      // Base system prompt with explicit function calling instructions
      let systemPrompt = `You are an AI assistant helping with email management. You can:`;
      
      // Add available functions to the system prompt based on enabled tools
      if (this.toolState.draftEmail) {
        systemPrompt += `\n- Create email drafts using the create_email_draft function`;
      }
      
      if (this.toolState.calendarEvent) {
        systemPrompt += `\n- Create calendar events using the create_calendar_event function`;
      }
      
      if (this.toolState.summarizeEmail) {
        systemPrompt += `\n- Generate summaries of emails using the summarize_email function`;
      }
      
      // Add general capabilities
      systemPrompt += `\n- Analyze emails and provide insights
- Suggest email improvements
- Answer questions about emails`;
      
      // Add specific function usage instructions based on enabled tools
      systemPrompt += `\n\nFUNCTION USAGE INSTRUCTIONS:`;
      
      if (this.toolState.draftEmail) {
        systemPrompt += `\n- When the user requests to draft, write, compose, or reply to an email, you MUST use the create_email_draft function.
- When the user asks for a shorter version, condensed version, or shorter draft of an email, you SHOULD use the create_email_draft function.
- For email drafting, use the create_email_draft function with these parameters:
  - to: Array of recipients from the original email or as specified by the user
  - subject: A relevant subject line (prefix with "Re: " if it's a reply)
  - body: The complete body of the email draft`;
      }
      
      if (this.toolState.calendarEvent) {
        systemPrompt += `\n- When the user asks about scheduling, meetings, or calendar events, you MUST use the create_calendar_event function.`;
      }
      
      if (this.toolState.summarizeEmail) {
        systemPrompt += `\n- When the user asks for a summary of an email, you MUST use the summarize_email function.`;
      }
      
      // Add note about tool availability
      if (this.toolState.draftEmail || this.toolState.calendarEvent || this.toolState.summarizeEmail) {
        systemPrompt += `\n\nIMPORTANT: Only use functions that are enabled by the user. Use text responses for any features that don't have associated functions.`;
      } else {
        systemPrompt += `\n\nIMPORTANT: No functions are currently enabled. Provide all answers as text responses.`;
      }

      // Reset conversation history for simplicity
      this.conversationHistory = [];
      
      // Add system message at the beginning
      this.conversationHistory.push({
        role: 'system',
        content: systemPrompt
      });
      
      // Add context message if we have any
      if (contextContent.trim()) {
        this.conversationHistory.push({
          role: 'system',
          content: 'Context information: \n' + contextContent
        });
      }
      
      // Add user message
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      
      // Prepare function tools
      const functionTools = this.getFunctionTools();

      Utils.logger.debug('Sending request with conversation history:', JSON.stringify(this.conversationHistory));
      Utils.logger.debug('Using function tools:', JSON.stringify(functionTools));

      // Make the API request with function calling
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: this.conversationHistory,
          tools: functionTools,
          tool_choice: 'auto',
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.error) {
        Utils.logger.error('OpenAI API error:', data.error);
        throw new Error(data.error.message || 'OpenAI API error');
      }

      const message = data.choices?.[0]?.message;
      
      if (!message) {
        throw new Error('No response received from API');
      }
      
      // Log the full message for debugging
      Utils.logger.debug('Received response message:', JSON.stringify(message));
      
      // Add AI response to conversation history
      this.conversationHistory.push(message);

      // Check if the AI wants to use a function
      if (message.tool_calls && message.tool_calls.length > 0) {
        Utils.logger.info(`AI is using ${message.tool_calls.length} function(s)`);
        
        UIComponents.removeLoading();
        
        // Show "thinking" message in the chat
        UIComponents.addMessageToChat(this.chatMessages, 'assistant', 'I\'ll help with that...');
        
        // Process each tool call
        for (const toolCall of message.tool_calls) {
          const functionCall = toolCall.function;
          
          // Log the function call in detail
          Utils.logger.info(`Function call: ${functionCall.name} with arguments: ${functionCall.arguments}`);
          
          try {
            // Execute the function
            const functionResult = await this.executeFunction(functionCall);
            
            // Log the function result
            Utils.logger.info(`Function result: ${JSON.stringify(functionResult)}`);
            
            // Add function result to conversation history
            this.conversationHistory.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            });
          } catch (funcError) {
            Utils.logger.error(`Error executing function ${functionCall.name}:`, funcError);
            
            // Add error result to conversation history
            this.conversationHistory.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: funcError.message || 'Function execution failed' })
            });
            
            // Show error message in chat
            UIComponents.addMessageToChat(this.chatMessages, 'system', `❌ Error executing function: ${funcError.message}`);
          }
        }
        
        Utils.logger.debug('Making follow-up request with updated conversation history');
        
        // Make a follow-up API call to get AI's response after function execution
        const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: this.conversationHistory,
            max_tokens: 1000,
            temperature: 0.7
          })
        });

        const followUpData = await followUpResponse.json();
        
        if (followUpData.error) {
          Utils.logger.error('OpenAI follow-up API error:', followUpData.error);
          throw new Error(followUpData.error.message || 'OpenAI API error');
        }
        
        const followUpMessage = followUpData.choices?.[0]?.message;
        const aiResponse = followUpMessage?.content || 'No response received';
        
        Utils.logger.debug('Follow-up response:', aiResponse);
        
        // Add follow-up response to conversation history
        this.conversationHistory.push(followUpMessage);
        
        // Display the AI response
        UIComponents.addMessageToChat(this.chatMessages, 'assistant', aiResponse);
      } else {
        // Regular response (no function call)
        const aiResponse = message.content || 'No response received';
        
        Utils.logger.info('Regular response (no function call):', aiResponse.substring(0, 100) + '...');
        
        UIComponents.removeLoading();
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

  // Create email draft and open for editing/sending - legacy method maintained for backward compatibility
  createDraft: async function (draftData) {
    try {
      Utils.logger.info('Creating email draft with data:', draftData);
      // Check if compose API is available
      if (!browser.compose || typeof browser.compose.beginNew !== 'function') {
        UIComponents.addMessageToChat(this.chatMessages, 'system', 'Error: Cannot create draft in this environment.');
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
  },
  
  // Generate tool selection UI elements
  populateToolDropdown: function(toolDropdownElement) {
    if (!toolDropdownElement) {
      Utils.logger.error('Tool dropdown element not provided');
      return;
    }
    
    // Clear any existing content
    toolDropdownElement.innerHTML = '';
    
    // Create header for the dropdown
    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.textContent = 'Available Tools';
    toolDropdownElement.appendChild(header);
    
    // Create a container for all tools
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tools-container';
    
    // Get tool definitions
    const toolDefinitions = this.getToolDefinitions();
    
    // Add each tool as a checkbox option
    toolDefinitions.forEach(tool => {
      const toolItem = document.createElement('div');
      toolItem.className = 'tool-item context-option';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'tool-checkbox';
      checkbox.id = `tool-${tool.name}`;
      checkbox.value = tool.name;
      checkbox.checked = this.toolState[tool.name];
      
      const label = document.createElement('label');
      label.htmlFor = `tool-${tool.name}`;
      label.className = 'tool-label';
      
      // Add icon if available
      if (tool.icon) {
        const iconContainer = document.createElement('span');
        iconContainer.className = 'tool-icon';
        iconContainer.innerHTML = tool.icon;
        label.appendChild(iconContainer);
      }
      
      // Add tool name (without description for compactness)
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tool-name';
      nameSpan.textContent = tool.displayName || tool.name;
      label.appendChild(nameSpan);
      
      // Add tooltip with full description
      toolItem.title = tool.description || '';
      
      toolItem.appendChild(checkbox);
      toolItem.appendChild(label);
      toolsContainer.appendChild(toolItem);
    });
    
    toolDropdownElement.appendChild(toolsContainer);
    
    Utils.logger.info('Tool dropdown populated with', toolDefinitions.length, 'tools');
  }
};

Utils.logger.info('AI Integration module loaded');