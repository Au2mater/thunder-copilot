# Architecture Overview

This document provides a high-level overview of the Thunder Copilot extension architecture, key improvements, and design patterns.

## Extension Architecture

Thunder Copilot follows a modular architecture with these core components:

1. **Background Script (`background.js`)**
   - Central controller for extension functionality
   - Handles message passing between components
   - Manages API access to Thunderbird

2. **API Wrapper (`thunderbird-api.js`)**
   - Standardized interface to Thunderbird WebExtension APIs
   - Error handling and response formatting
   - Abstracts complex API interactions

3. **Context Manager (`context-manager.js`)**
   - Manages email, text, and other context data
   - Provides context to UI components
   - Handles context serialization for passing between windows

4. **UI Components (`ui-components.js`)**
   - Reusable UI elements for the extension
   - Handles user interaction
   - Consistent styling and behavior

5. **Chat Interface (`chat-popup.js`, `index.js`)**
   - Main user interface for AI interaction
   - Sends/receives messages to AI service
   - Displays context and results

## Communication Flow

```
┌─────────────┐     ┌─────────────────┐     ┌───────────────┐
│ Thunderbird │     │  Background.js  │     │ UI Components │
└──────┬──────┘     └────────┬────────┘     └───────┬───────┘
       │                     │                      │
       │◄────API Calls──────►│                      │
       │                     │◄────Messages────────►│
       │                     │                      │
       │                     │    ┌──────────────┐  │
       └─────────────────────┼───►│ API Wrapper  │◄─┘
                             │    └──────────────┘
                             │
                             │    ┌──────────────┐
                             └───►│Context Manager│
                                  └──────────────┘
```

## Integration Improvements

We've successfully restructured the codebase to improve integration with Thunderbird's APIs:

### 1. ThunderbirdAPI Wrapper

A standardized wrapper providing:
- Consistent error handling with `ok` status flags
- Debug logging capabilities
- Clear namespaces for API categories
- Helper methods for common operations

### 2. Improved Context Management

- Robust cross-window context passing
- Standardized context objects
- Clear patterns for context retrieval

### 3. Better Error Handling

- Structured error responses with actionable information
- Defensive coding patterns throughout
- User-facing error messages when appropriate

## Window and Tab Interactions

The extension works with several window types:

1. **Main Window**: Primary Thunderbird interface
2. **Standalone Chat**: Popup window for AI interactions
3. **Composer Window**: Email drafting interface

Communication between these windows is managed through:
- URL parameters
- Browser message passing
- Background script coordination

## API Integration Patterns

The extension follows consistent patterns for API access:

1. **Window-Aware Queries**: Checks which window is making the request
2. **Tab Type Prioritization**: Checks appropriate tab types in order
3. **Defensive API Access**: Uses try/catch blocks and null checks
4. **Response Standardization**: Consistent response formats

## Future Improvements

While significant restructuring is complete, these areas can be enhanced:

1. **Draft Editing**: Improve integration with compose windows
2. **Calendar Integration**: Add support for calendar events
3. **Task Management**: Implement task creation/management
4. **Additional UI Improvements**: Enhanced user experience

## Benefits of Current Architecture

1. **Maintainability**: Clear separation of concerns
2. **Reliability**: Consistent error handling
3. **Extensibility**: Modular design for adding features
4. **Debuggability**: Built-in logging and debug tools