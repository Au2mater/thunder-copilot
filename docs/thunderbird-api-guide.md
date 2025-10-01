# Thunderbird API Guide

This guide provides comprehensive information about working with Thunderbird's WebExtension API in the Thunder Copilot extension.

## API Wrapper Overview

The ThunderbirdAPI wrapper (`thunderbird-api.js`) standardizes access to Thunderbird's APIs with:
- Consistent error handling and response structures
- Detailed logging for debugging
- Helper methods for common operations
- Namespaced organization by API category

```javascript
// Example response format
{
  ok: true,  // Success indicator
  data: {},  // Response data on success
  // OR
  ok: false,
  error: "Error message",
  operation: "Failed operation name"
}
```

## Window and Tab Management

### Window Types

- **Main Window**: Primary Thunderbird interface (`type: "normal"`)
- **Popup Windows**: Extension UI windows (`type: "popup"`)
- **Compose Windows**: Email composition (`type: "messageCompose"`)

### Tab Types

- `mail`: Mail folder view with message list
- `messageDisplay`: Individual message viewer
- `messageCompose`: Message composition
- `content`: Web content (extension pages)

### Window/Tab Access Pattern

```javascript
async function getRelevantWindows() {
  const currentWindow = await browser.windows.getCurrent();
  
  // Determine which windows to search
  if (currentWindow.type === 'popup') {
    // We're in a popup, search all normal windows
    const allWindows = await browser.windows.getAll();
    return allWindows.filter(win => win.type === 'normal');
  } else {
    // We're in a normal window, just use current
    return [currentWindow];
  }
}
```

## Key API Objects

### Window Object

```javascript
{
  "id": 1,              // Unique identifier
  "focused": false,     // Focus state
  "top": 0,             // Position (pixels)
  "left": -7,           
  "width": 1433,        // Dimensions
  "height": 1039,       
  "type": "normal",     // Window type
  "state": "normal",    // Window state
  "title": "Window Title"
}
```

### Tab Object

```javascript
{
  "id": 1,              // Unique identifier
  "windowId": 1,        // Parent window ID
  "active": true,       // Whether active in window
  "url": "...",         // Tab URL
  "title": "Tab Title", 
  "type": "mail",       // Tab type
  "mailTab": true       // Mail tab indicator
}
```

### Message Object

```javascript
{
  "id": 20,             // Unique identifier
  "date": "2025-09-20T10:35:08.000Z",
  "author": "\"user@example.com\" <user@example.com>",
  "recipients": ["recipient@example.com"],
  "subject": "Subject Line",
  "read": true,         // Read status
  "flagged": false,     // Flag status
  "folder": {           // Parent folder
    // Folder object
  },
  "parts": [            // Message body parts (when requested)
    {
      "body": "...",    
      "contentType": "text/plain"
    }
  ]
}
```

## Working with Messages

### Displayed Messages

Messages currently visible in a tab or preview pane:

```javascript
async function getDisplayedEmailFromAnyWindow() {
  const relevantWindows = await getRelevantWindows();
  
  for (const window of relevantWindows) {
    // Check active tabs in this window
    const tabs = await browser.tabs.query({ 
      windowId: window.id,
      active: true
    });
    
    // First check messageDisplay tabs
    for (const tab of tabs.filter(t => t.type === 'messageDisplay')) {
      try {
        const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
        if (message) return message;
      } catch (e) { /* continue */ }
    }
    
    // Then check mail tabs
    for (const tab of tabs.filter(t => t.type === 'mail')) {
      try {
        const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
        if (message) return message;
      } catch (e) { /* continue */ }
    }
  }
  
  return null;
}
```

### Selected Messages

Messages highlighted/checked in a mail tab's message list:

```javascript
async function getSelectedEmailsFromActiveTabs() {
  const relevantWindows = await getRelevantWindows();
  let selectedEmails = [];
  
  for (const window of relevantWindows) {
    // Get active mail tabs
    const activeTabs = await browser.mailTabs.query({ 
      active: true, 
      windowId: window.id 
    });
    
    // Get selections from each tab
    for (const tab of activeTabs) {
      try {
        const selected = await browser.mailTabs.getSelectedMessages(tab.id);
        if (selected?.messages?.length > 0) {
          selectedEmails.push(...selected.messages);
        }
      } catch (err) { /* continue */ }
    }
  }
  
  return selectedEmails;
}
```

## Error Handling Best Practices

1. **Always check API responses for success**:
   ```javascript
   const result = await ThunderbirdAPI.context.getCurrentEmail();
   if (result.ok) {
     // Success case
   } else {
     // Handle error with specific messaging
   }
   ```

2. **Wrap API calls in try/catch blocks**:
   ```javascript
   try {
     const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
   } catch (err) {
     console.error("Failed to get displayed message:", err);
   }
   ```

3. **Use defensive coding with optional chaining**:
   ```javascript
   if (selected?.messages?.length > 0) {
     // Process messages safely
   }
   ```

## Window Communication

### Cross-Window Context Passing

```javascript
// Sender: Adding context to URL
const contextParams = `?currentEmail=${encodeURIComponent(JSON.stringify(emailContext))}`;
const url = `index.html${contextParams}`;
browser.windows.create({ url, type: 'popup' });

// Receiver: Reading from URL
const urlParams = new URLSearchParams(window.location.search);
const emailParam = urlParams.get('currentEmail');
if (emailParam) {
  const emailContext = JSON.parse(decodeURIComponent(emailParam));
}
```

### Background Script Messaging

```javascript
// Request context from any window
browser.runtime.sendMessage({
  type: 'getContextForChat'
}).then(response => {
  // Handle response
});

// Background script handler
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'getContextForChat') {
    // Process and return data
    return Promise.resolve(contextData);
  }
});
```

## Common Issues and Solutions

1. **No messages found when clearly displayed/selected**
   - Check if querying from correct window context
   - Verify the tab type (mail tabs vs. message tabs)
   - Ensure error handling doesn't swallow legitimate errors

2. **Wrong window context**
   - Remember that popups and main Thunderbird windows are separate contexts
   - Always use window detection logic to find relevant windows

3. **Inconsistent results across different windows**
   - Use the wrapper API to standardize access patterns
   - Implement proper cross-window context passing