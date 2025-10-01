# Thunderbird API Wrapper

This document describes the standardized API wrapper (`thunderbird-api.js`) that provides consistent access to Thunderbird's WebExtension APIs with proper error handling, logging, and workarounds for common issues.

## Overview

The ThunderbirdAPI wrapper is designed to:

1. Standardize access to Thunderbird's WebExtension APIs
2. Provide consistent error handling
3. Return well-structured responses with `ok` status flags
4. Enable detailed logging for debugging
5. Abstract away complex API interactions

## Module Structure

The API wrapper is organized into namespaces that correspond to Thunderbird's API categories:

```javascript
const ThunderbirdAPI = {
  init(),                // Initialize the API module
  log(),                 // Internal logging function
  handleError(),         // Standardized error handling
  
  // Namespaces for API categories
  messages: {
    getFullContent(),
    search()
  },
  
  windows: {
    getAll(),
    create()
  },
  
  tabs: {
    query(),
    getActive()
  },
  
  mailTabs: {
    query(),
    getSelectedMessages()
  },
  
  messageDisplay: {
    getDisplayedMessage()
  },
  
  compose: {
    getDetails(),
    setDetails()
  },
  
  storage: {
    get(),
    set()
  },
  
  context: {
    getCurrentEmail(),
    getSelectedEmails(),
    getContextParams()
  }
};
```

## Response Format

All API methods return a consistent response structure:

```javascript
// Success response
{
  ok: true,
  [additional data properties]
}

// Error response
{
  ok: false,
  error: "Error message",
  operation: "Operation that failed"
}
```

## Usage Examples

### Initialization

```javascript
// Initialize with debug logging enabled
ThunderbirdAPI.init({
  debug: true,
  onError: (err) => console.error('Custom error handler:', err)
});
```

### Getting Current Email Context

```javascript
async function loadEmailContext() {
  const result = await ThunderbirdAPI.context.getCurrentEmail();
  
  if (result.ok) {
    console.log(`Email loaded: ${result.message.subject}`);
    return result.message;
  } else {
    console.error(`Failed to load email: ${result.error}`);
    return null;
  }
}
```

### Working with Windows

```javascript
async function openChatWindow(contextParams) {
  const result = await ThunderbirdAPI.windows.create({
    url: `index.html?${contextParams}`,
    type: 'popup',
    width: 600,
    height: 700
  });
  
  if (result.ok) {
    console.log(`Window created with ID: ${result.id}`);
    return result.window;
  } else {
    console.error(`Failed to create window: ${result.error}`);
    return null;
  }
}
```

### Updating Email Compose Content

```javascript
async function updateDraftWithAIContent(tabId, content) {
  const result = await ThunderbirdAPI.compose.setDetails(tabId, {
    body: content
  });
  
  return result.ok;
}
```

## Error Handling

The wrapper provides consistent error handling:

```javascript
try {
  const result = await ThunderbirdAPI.messages.getFullContent(messageId);
  
  if (result.ok) {
    // Handle success case
    processMessage(result.message);
  } else {
    // Handle error with details
    displayError(`Could not load message: ${result.error}`);
  }
} catch (e) {
  // Handle unexpected errors
  console.error("Unexpected error:", e);
}
```

## Context Helper Functions

The wrapper provides helper methods for common context-gathering operations:

### Getting Context Parameters for URLs

```javascript
async function openWindowWithContext() {
  const contextParams = await ThunderbirdAPI.context.getContextParams();
  const url = `index.html?${contextParams}`;
  
  // Open window with context
  await ThunderbirdAPI.windows.create({ url });
}
```

## Best Practices

1. **Always check the `ok` property** before accessing other properties of the result
2. **Use try/catch blocks** around API calls for unexpected errors
3. **Enable debug logging** during development to trace API calls
4. **Provide user feedback** when operations fail
5. **Use the context helper methods** to standardize context collection

## Implementation Notes

1. The wrapper is exposed as a global `ThunderbirdAPI` object
2. It can also be imported as a module when used in module contexts
3. Error handlers can be customized during initialization
4. All Thunderbird API calls are wrapped in try/catch blocks