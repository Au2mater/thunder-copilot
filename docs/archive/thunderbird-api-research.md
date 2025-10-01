# Thunderbird API Research for Copilot Extension

## Executive Summary

Based on research of the Thunderbird WebExtension APIs, here's how to implement each requested Copilot functionality:

## 1. Draft an Email

### APIs Available:
- **`compose` API** - Primary API for creating new email drafts
- **Permission required:** `compose`
- **Key functions:** 
  - Open new compose window
  - Pre-populate fields (to, subject, body)
  - React to compose events

### Implementation Strategy:
1. Use `browser.compose.beginNew()` to open new compose window
2. Pre-populate with AI-generated content using compose details object
3. Pass recipient suggestions from contact analysis

### Technical Notes:
- Compose API allows opening new message window with pre-filled data
- Can set recipients, subject, body content
- Supports both plain text and HTML content

## 2. Edit Existing Email Draft

### APIs Available:
- **`compose` API** - Can interact with existing compose windows
- **`composeScripts` API** - Inject scripts into compose windows
- **Permission required:** `compose`

### Implementation Strategy:
1. Use `browser.tabs.query()` to find existing compose tabs
2. Use `composeScripts` API to inject content modification scripts
3. Access compose window content via content scripts
4. Modify draft content through DOM manipulation or compose API

### Technical Notes:
- ComposeScripts work similar to content scripts but for compose windows
- Can modify compose window content programmatically
- Requires communication between background script and compose scripts

## 3. Create One Event

### APIs Available:
- **Calendar Experiment API** (Third-party) - Draft calendar API available
- **No native calendar API** in core Thunderbird WebExtensions

### Implementation Strategy:
1. Use Calendar Experiment API if available
2. Alternative: Create calendar files (.ics) and integrate with system
3. Use system calendar integration where possible

### Technical Notes:
- Calendar functionality requires experimental API
- Limited native support for calendar operations
- May need to implement custom calendar integration

## 4. Create Multiple Events at Once

### APIs Available:
- Same as single event creation but with batch processing

### Implementation Strategy:
1. Use Calendar Experiment API with loop for multiple events
2. Batch create calendar entries
3. Handle errors for individual event creation failures

### Technical Notes:
- Requires same calendar API access as single events
- Need proper error handling for bulk operations

## 5. Add One Task

### APIs Available:
- **No native task API** in Thunderbird WebExtensions
- Tasks are typically handled through calendar integration

### Implementation Strategy:
1. Use Calendar Experiment API if it supports tasks
2. Alternative: Create task entries as calendar events
3. Integration with external task management systems

### Technical Notes:
- Tasks not directly supported in core APIs
- May need to use calendar events as task substitutes

## 6. Add Multiple Tasks at Once

### APIs Available:
- Same limitations as single task creation

### Implementation Strategy:
1. Batch task creation using available calendar/task APIs
2. Proper error handling for bulk operations

## 7. Use Current Text Selection as Context

### APIs Available:
- **`tabs` API** with `executeScript`
- **`activeTab` permission**
- **Content Scripts** for accessing page content

### Implementation Strategy:
1. Use `tabs.executeScript()` to inject selection detection script
2. Use `window.getSelection()` in content script to get selected text
3. Send selection back to background script via runtime messaging
4. Use selection as context for AI operations

### Technical Notes:
- Content scripts can access `window.getSelection()`
- Need activeTab permission to access current tab content
- Communication via `runtime.sendMessage()` and `runtime.onMessage`

## 8. Add Other Email as Context

### APIs Available:
- **`messages` API** - Access message content
- **`messageDisplay` API** - Get currently displayed messages
- **Permissions required:** `messagesRead`, `accountsRead`

### Implementation Strategy:
1. Use `browser.messages.list()` to get available messages
2. Use `browser.messages.getFull()` to get complete message content
3. Allow user to select messages for context
4. Extract message content (headers, body) for AI context

### Technical Notes:
- Can access full message content including headers and body
- Can list messages from folders
- Need proper permissions for message access

## 9. Add Contacts List as Context

### APIs Available:
- **`addressBooks` API** - Access address books
- **`contacts` API** - Access individual contacts
- **Permission required:** `addressBooks`

### Implementation Strategy:
1. Use `browser.addressBooks.list()` to get available address books
2. Use `browser.contacts.list()` to get contacts from address books
3. Extract contact information (names, emails, etc.)
4. Provide contact data as context for AI suggestions

### Technical Notes:
- Full access to Thunderbird address books
- Can read contact details, emails, phone numbers
- Supports multiple address books

## Implementation Priority Order

1. **Draft an Email** (Highest priority - most straightforward)
2. **Add Contacts List as Context** (Good foundation feature)
3. **Use Current Text Selection as Context** (Enhances user experience)
4. **Add Other Email as Context** (Powerful context feature)
5. **Edit Existing Email Draft** (Builds on draft creation)
6. **Create One Event** (Requires experimental API)
7. **Create Multiple Events** (Extension of single event)
8. **Add One Task** (Limited API support)
9. **Add Multiple Tasks** (Extension of single task)

## Required Permissions

Based on the features, the following permissions will be needed:

```json
{
  "permissions": [
    "compose",
    "messagesRead", 
    "accountsRead",
    "addressBooks",
    "tabs",
    "activeTab",
    "messagesModify"
  ]
}
```

## Technical Architecture

### Background Script Structure:
- Main orchestrator for API calls
- Handles runtime messaging from content scripts
- Manages AI integration and API calls
- Coordinates between different Thunderbird APIs

### Content Scripts:
- Text selection detection
- Message content extraction
- Compose window interaction

### Communication Flow:
1. User triggers action via UI
2. Background script coordinates API calls
3. Content scripts handle DOM interactions
4. Runtime messaging for data exchange
5. AI processing and response generation
6. API calls to create/modify Thunderbird content

This architecture provides a solid foundation for implementing all requested Copilot features while working within Thunderbird's WebExtension API limitations.