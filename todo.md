# To Do

## Core Features (Based on docs/thunderbird-api-research.md)
- [ ] **Edit existing email draft** - Use `composeScripts` API to inject content modification scripts into compose windows
- [ ] **Create one calendar event** - Implement using Calendar Experiment API (requires third-party API integration)
- [ ] **Create multiple calendar events** - Batch event creation with proper error handling
- [ ] **Add one task** - Implement using Calendar Experiment API or create as calendar events
- [ ] **Add multiple tasks** - Batch task creation functionality
- [ ] **Use current text selection as context** - Use `tabs.executeScript()` with `window.getSelection()` in content scripts
- [ ] **Add other emails as context** - Enhance current email context system to support multiple email selection
- [ ] **Enhanced contacts integration** - Improve contact matching and suggestion algorithms

## UI/UX Improvements
- [ ] **Context management UI** - Improve context addition/removal interface
    - currently a static message is added to the chat when context is added
    - instead mimic vscode github copilot style with multiselect fields added to the top of the chat input with x for each to remove
- [ ] **Pinned sidebar option** - Allow users to pin the sidebar for persistent access
    - research if Thunderbird supports pinned sidebars or other panes that allow an always-visible but hidable / collapsible sidebar / panel
- [ ] **Text selection context button** - Add context option to capture selected text from any Thunderbird window
- [ ] **Email browser/picker** - UI to browse and select multiple emails for context
- [ ] **Calendar integration UI** - Interface for creating and managing calendar events/tasks
- [ ] **Rich text email drafting** - Support HTML formatting in generated emails

## Technical Enhancements  
- [ ] **Experiment API integration** - Set up Calendar Experiment API for events/tasks
- [ ] **Content scripts for text selection** - Implement text selection detection across Thunderbird
- [ ] **Message display scripts** - Enhance message interaction capabilities
- [ ] **Batch operations handling** - Robust error handling for multiple item creation
- [ ] **Context persistence** - Save context between sessions

## Current Issues to Fix
- [ ] **Obfuscate API keys in configuration** - Encrypt/mask API keys in storage
- [ ] **Keep current conversation cached after closing sidebar** - Persist chat history
- [ ] **Add new conversation button that clears the chat** - Reset conversation functionality

## Priority Implementation Order (from docs/thunderbird-api-research.md)
1. [x] **Draft an Email** - COMPLETED (see docs/email-drafting-implementation.md)
2. [x] **Add Contacts List as Context** - Enhance current basic implementation
3. [x] **Use Current Text Selection as Context** - High value feature
4. [ ] **Add Other Emails as Context** - Extend current single email support  with multiple email selection
5. [ ] **Edit Existing Email Draft** - Builds on draft creation
6. [ ] **Create One Event** - Requires Calendar Experiment API setup
7. [ ] **Create Multiple Events** - Extension of single event
8. [ ] **Add One Task** - Limited native API support
9. [ ] **Add Multiple Tasks** - Extension of single task

# In progress

# Done
- [x] **Research Thunderbird APIs** - Comprehensive research documented in docs/thunderbird-api-research.md
- [x] **Draft an email functionality** - Implemented with AI integration, context support, and Thunderbird compose API integration (see docs/email-drafting-implementation.md)
- [x] **Basic contacts context** - Can load address book contacts as context for AI
- [x] **Current email context** - Can add displayed email to conversation context
- [x] **Quick action buttons** - UI shortcuts for common operations
- [x] **Draft preview functionality** - Preview generated emails before creation