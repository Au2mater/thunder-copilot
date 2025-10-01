# Thunderbird API Objects Reference

This document describes the data structures available through the Thunderbird WebExtension API that are used in the Thunder Copilot extension. Understanding these structures is critical for debugging and implementing features that interact with Thunderbird's windows, tabs, messages, and folders.

## Windows

Windows represent the top-level containers in Thunderbird. Each window can contain multiple tabs.

```javascript
{
  "id": 1,              // Unique identifier for the window
  "focused": false,     // Whether the window is currently focused
  "top": 0,             // Y position of the window (pixels)
  "left": -7,           // X position of the window (pixels)
  "width": 1433,        // Width of the window (pixels)
  "height": 1039,       // Height of the window (pixels)
  "incognito": false,   // Whether the window is in private browsing mode
  "type": "normal",     // Window type (normal, popup, messageCompose)
  "state": "normal",    // Window state (normal, minimized, maximized)
  "alwaysOnTop": false, // Whether the window is always on top
  "title": "Window Title", // Title of the window
  "tabs": []            // Array of Tab objects in this window
}
```

### Window Types

- `normal`: Standard Thunderbird main window
- `popup`: Popup window (like extension windows)
- `messageCompose`: Message composition window
- `messageDisplay`: Message display window (standalone message viewer)

## Tabs

Tabs represent individual panels within a window. Thunderbird has specialized tab types for different content.

```javascript
{
  "id": 1,              // Unique identifier for the tab
  "index": 0,           // Position of the tab within the window
  "windowId": 1,        // ID of the parent window
  "highlighted": true,  // Whether the tab is highlighted
  "active": true,       // Whether the tab is the active tab in the window
  "status": "complete", // Loading status (complete, loading)
  "width": 522,         // Width of the tab content (pixels)
  "height": 791,        // Height of the tab content (pixels)
  "groupId": -1,        // Tab group identifier
  "cookieStoreId": "firefox-default", // Cookie store identifier
  "url": "imap://...",  // URL of the tab content
  "title": "Tab Title", // Title of the tab
  "favIconUrl": "chrome://...", // URL of the favicon
  "spaceId": 1,         // Thunderbird workspace identifier
  "type": "mail",       // Type of tab (mail, messageDisplay, content, etc.)
  "mailTab": true       // Whether the tab is a mail tab
}
```

### Tab Types

- `mail`: Mail folder view (inbox, folders list, etc.)
- `messageDisplay`: Message viewer
- `messageCompose`: Message composition
- `content`: Web content (extension pages, web pages)
- `special`: Special pages like about:preferences or about:addons

## Mail Tabs

Mail tabs are a specialized form of tabs specifically for displaying mail folders and message lists.

```javascript
{
  "windowId": 1,        // ID of the parent window
  "active": true,       // Whether the tab is active
  "layout": "vertical", // Layout orientation
  "folderMode": "all",  // Current folder view mode
  "folderModesEnabled": ["all"], // Available folder modes
  "id": 1,              // Tab ID
  "folderPaneVisible": true, // Whether the folder pane is visible
  "messagePaneVisible": true, // Whether the message pane is visible
  "sortType": "date",   // How messages are sorted
  "sortOrder": "descending", // Sort direction
  "viewType": "groupedByThread", // How messages are grouped
  "displayedFolder": {  // Currently displayed folder object
    // Folder object (see below)
  }
}
```

## Messages

Messages represent email messages within Thunderbird. They can be displayed in message display tabs or selected in mail tabs.

```javascript
{
  "id": 20,             // Unique identifier for the message
  "date": "2025-09-20T10:35:08.000Z", // Date the message was sent
  "author": "\"user@example.com\" <user@example.com>", // Sender
  "recipients": [       // Array of recipient email addresses
    "recipient@example.com"
  ],
  "ccList": [],         // Carbon copy recipients
  "bccList": [],        // Blind carbon copy recipients
  "subject": "Subject Line", // Message subject
  "read": true,         // Whether the message has been read
  "new": false,         // Whether the message is new
  "headersOnly": false, // Whether only headers are downloaded
  "flagged": false,     // Whether the message is flagged
  "junk": false,        // Whether the message is marked as junk
  "junkScore": 0,       // Junk score (0-100)
  "headerMessageId": "...", // Message-ID header value
  "size": 70365,        // Size of the message in bytes
  "tags": [],           // Tags applied to the message
  "external": false,    // Whether the message is from external source
  "folder": {           // Folder containing the message
    // Folder object (see below)
  },
  "parts": [            // Optional: present when full message is retrieved
    {                   // Array of message parts (bodies)
      "body": "...",    // Content of the message part
      "contentType": "text/plain", // MIME type
      "name": "...",    // Part name
      "partName": "..."  // Identifier for the part
    }
  ]
}
```

## Folders

Folders represent mail folders in Thunderbird's folder structure.

```javascript
{
  "id": "account1://INBOX/Path/Subfolder", // Unique identifier for the folder
  "name": "Subfolder",    // Folder name
  "path": "/INBOX/Path/Subfolder", // Path from account root
  "specialUse": [],       // Special folder designations (e.g., ["inbox", "sent"])
  "isFavorite": false,    // Whether the folder is marked as a favorite
  "isRoot": false,        // Whether this is an account's root folder
  "isTag": false,         // Whether this is a tag folder
  "isUnified": false,     // Whether this is a unified/smart folder
  "isVirtual": false,     // Whether this is a virtual folder
  "accountId": "account1" // ID of the parent account
}
```

## Displayed Messages

Displayed messages represent messages currently visible in message display or mail tabs.

```javascript
{
  "tabId": 1,          // ID of the tab displaying the message
  "tabType": "mail",   // Type of tab (mail or messageDisplay)
  "message": {         // Message object (see above)
    // Message fields
  }
}
```

## Selected Messages

Selected messages represent messages that are currently selected by the user in a mail tab.

```javascript
{
  "tabId": 1,          // ID of the tab with selections
  "messages": [        // Array of selected Message objects
    {
      // Message fields (see Message object)
    }
  ]
}
```

## Context Structures

When passing context between windows or to the AI assistant, simplified message contexts are often used:

```javascript
{
  "id": 20,                     // Message ID
  "subject": "Message Subject", // Subject line
  "author": "user@example.com", // Sender
  "date": "2025-09-20T10:35:08.000Z" // Date sent
}
```

## URL Parameters

When opening a standalone chat window, context is passed through URL parameters:

```
index.html?standalone=1&currentEmail={...}&selectedEmails=[{...}]
```

Where:
- `currentEmail` is a JSON string of the current email context
- `selectedEmails` is a JSON string array of selected email contexts

## Debug Data Structure

The debug tool provides a comprehensive view of the current state of Thunderbird:

```javascript
{
  "windows": [/* Window objects */],
  "tabs": [/* Tab objects */],
  "mailTabs": [/* MailTab objects */],
  "displayedMessages": [/* DisplayedMessage objects */],
  "selectedMessages": [/* SelectedMessage objects */]
}
```

## Background Script Message Types

The extension's background script handles various message types:

- `getContextForChat`: Get context for the chat window
- `getCurrentDisplayedEmailForContext`: Get the current displayed email
- `getCurrentSelectedEmailsForContext`: Get currently selected emails
- `getCurrentDraftForEdit`: Get the current draft being composed
- `overwriteDraftWithCopilot`: Update a draft with AI-generated content