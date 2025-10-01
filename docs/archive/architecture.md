# Thunder Copilot Architecture

This document outlines the architecture of the Thunder Copilot extension, explaining how components interact and how data flows through the system.

## Overall Architecture

Thunder Copilot follows a modular architecture pattern with these key components:

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  User Interface │     │  Core Modules    │     │  Thunderbird  │
│  Components     │◄────┼──────────────────┼────►│  API Access   │
└─────────────────┘     │                  │     └───────────────┘
                        │  - AIIntegration │
                        │  - ContextManager│
                        │  - Utils        │
                        │  - Debug        │
                        └──────────────────┘
                               ▲
                               │
                               ▼
                        ┌──────────────────┐
                        │  Background      │
                        │  Script          │
                        └──────────────────┘
```

### Key Components

1. **Background Script (background.js)**
   - Acts as the central controller and service provider
   - Has elevated API access to Thunderbird functionality
   - Maintains state across different windows
   - Handles messaging between components

2. **Context Manager (context-manager.js)**
   - Manages collection, storage, and retrieval of email/message context
   - Provides APIs for UI components to access context information
   - Handles serialization/deserialization of context for transfer between windows

3. **AI Integration (ai-integration.js)**
   - Manages communication with AI services
   - Formats context data for AI processing
   - Handles tool invocation and response parsing

4. **UI Components (ui-components.js)**
   - Provides reusable UI elements and patterns
   - Handles rendering of messages, context indicators, etc.
   - Manages UI state and interaction logic

5. **Utils (utils.js)**
   - Contains shared utility functions
   - Provides helper methods for common operations
   - Handles logging and debugging functions

6. **Debug Tools (debug.js)**
   - Provides diagnostic capabilities
   - Visualizes internal state and Thunderbird API objects
   - Facilitates testing of functionality in isolation

## Data Flow

### Email Context Flow

```
┌───────────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│ Thunderbird   │     │ Background  │     │ Context    │     │ AI        │
│ Mail Windows  │────►│ Script      │────►│ Manager    │────►│ Service   │
└───────────────┘     └─────────────┘     └────────────┘     └───────────┘
      │                                         │                  │
      │                                         ▼                  │
      │                                    ┌────────────┐          │
      └───────────────────────────────────►│ UI         │◄─────────┘
                                           │ Components │
                                           └────────────┘
```

### User Interaction Flow

```
┌───────────────┐     ┌────────────┐     ┌─────────────┐
│ User          │     │ UI         │     │ Context     │
│ Interaction   │────►│ Components │────►│ Manager     │
└───────────────┘     └────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                      ┌─────────────┐    ┌────────────┐
                      │ AI          │    │ Background │
                      │ Integration │◄───┤ Script     │
                      └─────────────┘    └────────────┘
```

## Module Dependencies

```
┌─────────────────┐
│  background.js  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  context-       │     │  ai-            │
│  manager.js     │────►│  integration.js │
└────────┬────────┘     └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│  ui-            │     │  utils.js       │
│  components.js  │────►│                 │
└─────────────────┘     └─────────────────┘
```

## API Access Patterns

Different window types in Thunderbird have different levels of API access. Our architecture handles this through:

1. **Delegated API Access**: Window-specific code delegates API calls to the background script
2. **Context Passing**: Essential context is passed via URL parameters when opening new windows
3. **Message Passing**: Runtime messaging for real-time data exchange

## API Objects vs. User Experience

There's a notable disconnect between Thunderbird's API objects and the actual user interface:

1. **Windows and Tabs**: What users see as a single window may contain multiple tabs in the API
2. **Phantom Windows**: The API reports many windows that are not visible to users
3. **Window Types**: Different window types (`normal`, `messageCompose`, `popup`) require different handling

See `docs/api-vs-ui.md` for a detailed explanation of how API objects map to the user interface.

## Thunderbird Integration Points

The extension integrates with Thunderbird at these key points:

1. **Browser Action**: Main toolbar button that opens the standalone chat window
2. **Compose Action**: Toolbar button in the compose window for draft editing
3. **Message Display**: Access to currently displayed message content
4. **Message Selection**: Access to messages selected in folder views
5. **Compose Integration**: Integration with the email composition process

## State Management

State is managed at multiple levels:

1. **Background Script**: Global state persists across windows
2. **Local Storage**: Settings and persistent data
3. **URL Parameters**: State passed during window creation
4. **Window-Local State**: UI state maintained within each window

## Error Handling Strategy

The extension uses a layered approach to error handling:

1. **API Error Catching**: All Thunderbird API calls are wrapped in try/catch blocks
2. **User-Facing Errors**: Translated into friendly messages when appropriate
3. **Logging**: Errors logged with context for debugging
4. **Degraded Functionality**: Components gracefully degrade when APIs are unavailable

## Extension Loading Sequence

1. Background script initializes
2. Browser action becomes available
3. User triggers browser action
4. Standalone window opens with context
5. UI components initialize and render
6. Context is displayed and interaction begins

## Proposed Improvements

1. **API Wrapper Module**: Create a dedicated module for Thunderbird API access
2. **Consistent Error Handling**: Standardize error handling across components
3. **State Management**: Improve state synchronization between windows
4. **Permissions Model**: Implement granular permissions usage
5. **Documentation**: Add detailed JSDoc comments to all modules