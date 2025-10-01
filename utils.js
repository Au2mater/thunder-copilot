// utils.js - Common utilities and helper functions

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

// Convenience functions for logging
const logger = {
  debug: (msg, ...args) => log('debug', msg, ...args),
  info: (msg, ...args) => log('info', msg, ...args),
  warn: (msg, ...args) => log('warn', msg, ...args),
  error: (msg, ...args) => log('error', msg, ...args)
};

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-resize textarea utility
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  const scrollHeight = textarea.scrollHeight;
  const maxHeight = 150;
  textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
}

// Utility functions module
const Utils = {
  logger,
  escapeHtml,
  autoResizeTextarea,
  
  // Helper to close dropdown properly
  closeContextDropdown: function(contextDropdown) {
    contextDropdown.style.display = 'none';
    // Keep the dropdown-up class so it's consistent when reopened
  },
  
  // Parse email draft from AI response
  parseEmailDraft: function(response) {
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
          const toEmails = line.replace('TO:', '').trim();
          draft.to = toEmails.split(',').map(email => email.trim()).filter(email => email);
        } else if (line.startsWith('SUBJECT:')) {
          draft.subject = line.replace('SUBJECT:', '').trim();
        } else if (line.startsWith('BODY:')) {
          inBody = true;
          continue;
        } else if (inBody) {
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
};

// Initialize logging
logger.info('Utils module loaded');