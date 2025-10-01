/**
 * @file thunderbird-api.js
 * @description Standardized wrapper for Thunderbird WebExtension API access
 * 
 * This module provides a consistent interface for accessing Thunderbird's WebExtension
 * APIs, with proper error handling, logging, and workarounds for common issues.
 */

/**
 * ThunderbirdAPI - A wrapper for Thunderbird's WebExtension API
 * @namespace ThunderbirdAPI
 */
const ThunderbirdAPI = {
  /**
   * Initialize the API module
   * @param {Object} options - Configuration options
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {Function} [options.onError] - Error handler callback
   */
  init(options = {}) {
    this.debug = options.debug || false;
    this.onError = options.onError || ((err) => console.error('TB API Error:', err));
    this.log('ThunderbirdAPI initialized');
  },

  /**
   * Log a message if debug is enabled
   * @param {...any} args - Arguments to log
   * @private
   */
  log(...args) {
    if (this.debug) {
      console.log('[TB-API]', ...args);
    }
  },

  /**
   * Handle API errors consistently
   * @param {Error} error - The error object
   * @param {string} operation - Description of the operation that failed
   * @param {boolean} [throwError=false] - Whether to rethrow the error
   * @returns {Object} Error result object
   * @private
   */
  handleError(error, operation, throwError = false) {
    const errorObj = {
      ok: false,
      error: error.message || 'Unknown error',
      operation
    };
    
    this.log(`Error in ${operation}:`, error);
    this.onError(errorObj);
    
    if (throwError) {
      throw error;
    }
    
    return errorObj;
  },

  /**
   * Message access functions
   */
  messages: {
    /**
     * Get full content of a message by ID
     * @param {string} messageId - Message ID
     * @returns {Promise<Object>} Full message content or error object
     */
    async getFullContent(messageId) {
      try {
        ThunderbirdAPI.log(`Getting full content for message: ${messageId}`);
        const fullMessage = await browser.messages.getFull(messageId);
        
        // Extract body content from message parts
        let body = '';
        if (fullMessage.parts) {
          body = fullMessage.parts.map(part => part.body || '').join('\n');
        }
        
        return { 
          ok: true, 
          message: fullMessage,
          body,
          messageId
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `getFullContent(${messageId})`);
      }
    },
    
    /**
     * Search for messages matching given criteria
     * @param {Object} query - Query parameters for message search
     * @returns {Promise<Object>} Search results or error object
     */
    async search(query) {
      try {
        ThunderbirdAPI.log('Searching messages with query:', query);
        const result = await browser.messages.query(query);
        
        return {
          ok: true,
          messages: result.messages || [],
          totalCount: result.messages?.length || 0
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `search(${JSON.stringify(query)})`);
      }
    }
  },
  
  /**
   * Window management functions
   */
  windows: {
    /**
     * Get all windows with optional filtering
     * @param {Object} [options] - Options for window retrieval
     * @param {boolean} [options.populate=false] - Whether to include tabs
     * @param {string} [options.windowType] - Filter by window type
     * @returns {Promise<Object>} Windows or error object
     */
    async getAll(options = {}) {
      try {
        const windowOptions = { 
          populate: options.populate || false,
          windowType: options.windowType
        };
        
        ThunderbirdAPI.log('Getting all windows with options:', windowOptions);
        const windows = await browser.windows.getAll(windowOptions);
        
        return {
          ok: true,
          windows,
          count: windows.length
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'getAll windows');
      }
    },
    
    /**
     * Get only user-visible windows (filtering out background/phantom windows)
     * @param {Object} [options] - Options for window retrieval
     * @param {boolean} [options.populate=true] - Whether to include tabs
     * @returns {Promise<Object>} User-visible windows or error object
     */
    async getUserVisibleWindows(options = {}) {
      try {
        // Always populate tabs to help identify window purpose
        const windowOptions = { 
          populate: options.populate !== undefined ? options.populate : true
        };
        
        ThunderbirdAPI.log('Getting user-visible windows');
        const allWindows = await browser.windows.getAll(windowOptions);
        
        // Count phantom windows (useful for debugging)
        const phantomWindows = allWindows.filter(win => 
          win.title === 'Mozilla Thunderbird' && 
          win.tabs && 
          win.tabs.length === 1 && 
          win.tabs[0].url === 'about:blank'
        );
        
        // Filter to only show windows that are visible to the user
        const userVisibleWindows = allWindows.filter(win => {
          // Keep main windows, compose windows, and most popups
          if (['normal', 'messageCompose'].includes(win.type)) {
            return true;
          }
          
          // For popups, only keep those with meaningful titles and content
          if (win.type === 'popup') {
            // Skip generic "Mozilla Thunderbird" popups with blank content
            if (win.title === 'Mozilla Thunderbird' && 
                win.tabs && 
                win.tabs.length === 1 && 
                win.tabs[0].url === 'about:blank') {
              return false;
            }
            
            // Skip hidden windows
            if (win.title && win.title.toLowerCase().includes('hidden')) {
              return false;
            }
            
            // Keep extension popups and other visible popups
            return true;
          }
          
          return false;
        });
        
        return {
          ok: true,
          windows: userVisibleWindows,
          count: userVisibleWindows.length,
          totalCount: allWindows.length,
          phantomCount: phantomWindows.length
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'getUserVisibleWindows');
      }
    },
    
    /**
     * Open a new window with standardized options
     * @param {Object} options - Window creation options
     * @param {string} options.url - URL to load
     * @param {string} [options.type='popup'] - Window type
     * @param {number} [options.width=600] - Window width
     * @param {number} [options.height=700] - Window height
     * @returns {Promise<Object>} Created window or error object
     */
    async create(options) {
      try {
        const windowOptions = {
          url: options.url,
          type: options.type || 'popup',
          width: options.width || 600,
          height: options.height || 700
        };
        
        ThunderbirdAPI.log('Creating new window:', windowOptions);
        const window = await browser.windows.create(windowOptions);
        
        return {
          ok: true,
          window,
          id: window.id
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'create window');
      }
    }
  },
  
  /**
   * Tab management functions
   */
  tabs: {
    /**
     * Query for tabs matching criteria
     * @param {Object} [queryInfo={}] - Query parameters
     * @returns {Promise<Object>} Matching tabs or error object
     */
    async query(queryInfo = {}) {
      try {
        ThunderbirdAPI.log('Querying tabs with:', queryInfo);
        const tabs = await browser.tabs.query(queryInfo);
        
        return {
          ok: true,
          tabs,
          count: tabs.length
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `query tabs (${JSON.stringify(queryInfo)})`);
      }
    },
    
    /**
     * Get active tab in current window
     * @returns {Promise<Object>} Active tab or error object
     */
    async getActive() {
      return this.query({ active: true, currentWindow: true })
        .then(result => {
          if (result.ok && result.tabs.length > 0) {
            return {
              ok: true,
              tab: result.tabs[0],
              id: result.tabs[0].id
            };
          } else {
            return {
              ok: false,
              error: 'No active tab found',
              operation: 'getActive'
            };
          }
        });
    }
  },
  
  /**
   * Mail tab specific functions
   */
  mailTabs: {
    /**
     * Query for mail tabs
     * @param {Object} [queryInfo={}] - Query parameters
     * @returns {Promise<Object>} Mail tabs or error object
     */
    async query(queryInfo = {}) {
      try {
        ThunderbirdAPI.log('Querying mail tabs with:', queryInfo);
        const mailTabs = await browser.mailTabs.query(queryInfo);
        
        return {
          ok: true,
          mailTabs,
          count: mailTabs.length
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'query mailTabs');
      }
    },
    
    /**
     * Get selected messages in a mail tab
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object>} Selected messages or error object
     */
    async getSelectedMessages(tabId) {
      try {
        ThunderbirdAPI.log(`Getting selected messages in tab: ${tabId}`);
        const selected = await browser.mailTabs.getSelectedMessages(tabId);
        
        return {
          ok: true,
          messages: selected.messages || [],
          count: selected.messages?.length || 0,
          tabId
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `getSelectedMessages(${tabId})`);
      }
    }
  },
  
  /**
   * Message display functions
   */
  messageDisplay: {
    /**
     * Get displayed message in a tab
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object>} Displayed message or error object
     */
    async getDisplayedMessage(tabId) {
      try {
        ThunderbirdAPI.log(`Getting displayed message in tab: ${tabId}`);
        const message = await browser.messageDisplay.getDisplayedMessage(tabId);
        
        if (!message) {
          return {
            ok: false,
            error: 'No message displayed in this tab',
            tabId
          };
        }
        
        return {
          ok: true,
          message,
          id: message.id,
          subject: message.subject,
          tabId
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `getDisplayedMessage(${tabId})`);
      }
    }
  },
  
  /**
   * Compose functions
   */
  compose: {
    /**
     * Get compose details from a compose tab
     * @param {number} tabId - Compose tab ID
     * @returns {Promise<Object>} Compose details or error object
     */
    async getDetails(tabId) {
      try {
        ThunderbirdAPI.log(`Getting compose details for tab: ${tabId}`);
        const details = await browser.compose.getComposeDetails(tabId);
        
        return {
          ok: true,
          details,
          body: details.body || '',
          subject: details.subject || '',
          tabId
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `getComposeDetails(${tabId})`);
      }
    },
    
    /**
     * Update compose details in a compose tab
     * @param {number} tabId - Compose tab ID
     * @param {Object} details - New compose details
     * @returns {Promise<Object>} Result or error object
     */
    async setDetails(tabId, details) {
      try {
        ThunderbirdAPI.log(`Setting compose details for tab: ${tabId}`, details);
        await browser.compose.setComposeDetails(tabId, details);
        
        return {
          ok: true,
          tabId,
          updated: true
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `setComposeDetails(${tabId})`);
      }
    }
  },
  
  /**
   * Storage functions with error handling
   */
  storage: {
    /**
     * Get items from local storage
     * @param {string|string[]|Object} keys - Keys to retrieve
     * @returns {Promise<Object>} Retrieved items or error object
     */
    async get(keys) {
      try {
        ThunderbirdAPI.log(`Getting storage items:`, keys);
        const items = await browser.storage.local.get(keys);
        
        return {
          ok: true,
          items
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `storage.get(${JSON.stringify(keys)})`);
      }
    },
    
    /**
     * Save items to local storage
     * @param {Object} items - Items to store
     * @returns {Promise<Object>} Result or error object
     */
    async set(items) {
      try {
        ThunderbirdAPI.log(`Setting storage items:`, items);
        await browser.storage.local.set(items);
        
        return {
          ok: true,
          saved: true
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, `storage.set(${JSON.stringify(items)})`);
      }
    }
  },
  
  /**
   * Context capturing helper functions
   */
  context: {
    /**
     * Get the current email context
     * @returns {Promise<Object>} Current email context or error object
     */
    async getCurrentEmail() {
      try {
        // First get the active tab
        const tabResult = await ThunderbirdAPI.tabs.getActive();
        
        if (!tabResult.ok) {
          return {
            ok: false,
            error: 'Could not get active tab',
            operation: 'getCurrentEmail'
          };
        }
        
        // Try to get displayed message from the tab
        const messageResult = await ThunderbirdAPI.messageDisplay.getDisplayedMessage(tabResult.tab.id);
        
        if (!messageResult.ok) {
          return {
            ok: false,
            error: 'No message displayed in active tab',
            operation: 'getCurrentEmail'
          };
        }
        
        // Get full content of the message
        const fullContentResult = await ThunderbirdAPI.messages.getFullContent(messageResult.message.id);
        
        if (!fullContentResult.ok) {
          return {
            ok: false,
            error: 'Could not get message content',
            operation: 'getCurrentEmail'
          };
        }
        
        // Return combined result
        return {
          ok: true,
          message: messageResult.message,
          fullContent: fullContentResult.message,
          body: fullContentResult.body
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'getCurrentEmail');
      }
    },
    
    /**
     * Get selected emails in the active mail tab
     * @returns {Promise<Object>} Selected emails or error object
     */
    async getSelectedEmails() {
      try {
        // Get active mail tab
        const mailTabsResult = await ThunderbirdAPI.mailTabs.query({ active: true, currentWindow: true });
        
        if (!mailTabsResult.ok || mailTabsResult.count === 0) {
          return {
            ok: false,
            error: 'No active mail tab found',
            operation: 'getSelectedEmails'
          };
        }
        
        // Get selected messages in the mail tab
        const mailTab = mailTabsResult.mailTabs[0];
        const selectedResult = await ThunderbirdAPI.mailTabs.getSelectedMessages(mailTab.id);
        
        if (!selectedResult.ok) {
          return {
            ok: false,
            error: 'Could not get selected messages',
            operation: 'getSelectedEmails'
          };
        }
        
        return {
          ok: true,
          messages: selectedResult.messages,
          count: selectedResult.count
        };
      } catch (error) {
        return ThunderbirdAPI.handleError(error, 'getSelectedEmails');
      }
    },
    
    /**
     * Prepare context parameters for URL
     * @returns {Promise<string>} URL parameters string
     */
    async getContextParams() {
      let params = '';
      
      // Try to get current email
      const currentEmail = await this.getCurrentEmail();
      if (currentEmail.ok && currentEmail.message) {
        const emailContext = {
          id: currentEmail.message.id,
          subject: currentEmail.message.subject,
          author: currentEmail.message.author,
          date: currentEmail.message.date
        };
        params += `&currentEmail=${encodeURIComponent(JSON.stringify(emailContext))}`;
      }
      
      // Try to get selected emails
      const selectedEmails = await this.getSelectedEmails();
      if (selectedEmails.ok && selectedEmails.count > 0) {
        const emailContexts = selectedEmails.messages.map(email => ({
          id: email.id,
          subject: email.subject,
          author: email.author,
          date: email.date
        }));
        params += `&selectedEmails=${encodeURIComponent(JSON.stringify(emailContexts))}`;
      }
      
      return params;
    }
  }
};

// Export the API object
if (typeof module !== 'undefined') {
  module.exports = ThunderbirdAPI;
}