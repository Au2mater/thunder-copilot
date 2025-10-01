# Context Management in Thunder Copilot

This document explains how context is managed within the Thunder Copilot extension, including how email context is captured, stored, and shared between different windows and components.

## Context Types

Thunder Copilot manages several types of context:

1. **Email Context**: Information about specific emails (current or selected)
2. **Text Selection Context**: Text selected by the user in the current email
3. **Contact Context**: Information about contacts from address books
4. **Draft Context**: Content of email drafts being edited

## Email Context Structure

Email context is stored in a simplified format to avoid excessive data:

```javascript
{
  id: "123",                    // Thunderbird message ID
  subject: "Meeting Notes",     // Email subject
  author: "user@example.com",   // Email sender
  date: "2023-04-01T12:00:00Z"  // Email timestamp
}
```

When full message content is needed, it is fetched on-demand using the message ID.

## Context Flow Between Windows

Context is shared between windows using several mechanisms:

### 1. URL Parameters

When opening a standalone chat window, context is passed via URL parameters:

```
index.html?standalone=1&currentEmail={...}&selectedEmails=[{...}]
```

These parameters are parsed on window load to restore context.

### 2. Background Script Messaging

Windows can request context from the background script:

```javascript
browser.runtime.sendMessage({ type: 'getContextForChat' })
  .then(context => {
    // Process context
  });
```

### 3. Real-time Context Fetching

When context can't be passed directly, components can request it:

```javascript
// Get currently displayed email
browser.runtime.sendMessage({ 
  type: 'getCurrentDisplayedEmailForContext',
  fromStandaloneWindow: true 
});

// Get selected emails
browser.runtime.sendMessage({ 
  type: 'getCurrentSelectedEmailsForContext',
  fromStandaloneWindow: true 
});
```

## ContextManager Module

The extension uses a dedicated `ContextManager` module that provides:

1. Storage for different types of context
2. Methods to add/remove context items
3. UI update functions for displaying context
4. Context serialization/deserialization

### Key Components

```javascript
ContextManager.emailContext    // Array of email contexts
ContextManager.textContext     // Array of text selection contexts
ContextManager.contactContext  // Array of contact contexts

ContextManager.addCurrentEmail()       // Add current email to context
ContextManager.addSelectedEmails()     // Add selected emails to context
ContextManager.addTextSelection()      // Add selected text to context
ContextManager.updateContextUI()       // Update UI to show current context
```

## Context Isolation Challenges

Thunderbird's API has context isolation between different windows, leading to these limitations:

1. A standalone window cannot directly access message content from the main Thunderbird window
2. Extension pages in tabs have different API access than the main window
3. Content scripts can only access the DOM, not Thunderbird's API

The extension uses the background script as a central hub to work around these limitations.

## Debug Context Tools

The debug panel provides tools to diagnose context issues:

1. View which messages are currently displayed in which tabs
2. Check which messages are currently selected
3. Test whether background script functions can access expected context
4. Verify URL parameters when context is passed between windows

## Context Persistence

Context is not automatically persisted across extension restarts. When the extension is reloaded:

1. Context in the background script is lost
2. Standalone windows must re-fetch context
3. URL parameters must be re-parsed

## Context Flow Diagram

```
┌───────────────┐     ┌─────────────────┐     ┌────────────────┐
│ Main TB Window│     │  Background.js  │     │ Standalone Chat│
└───────┬───────┘     └────────┬────────┘     └────────┬───────┘
        │                      │                       │
        ├──getCurrent/         │                       │
        │  Selected Email─────►│                       │
        │                      │                       │
        │                      │◄──getContextForChat───┤
        │                      │                       │
        │                      ├──Context as JSON─────►│
        │                      │                       │
        │  URL Parameters      │                       │
        ├─────────────────────────────────────────────►│
        │  (currentEmail,      │                       │
        │   selectedEmails)    │                       │
```

## Best Practices for Context Management

1. Always check if context exists before trying to use it
2. Provide fallback mechanisms when context is not available
3. Use the debug tools to verify context flow
4. Consider window types when accessing API functions
5. Remember that API access differs between window types