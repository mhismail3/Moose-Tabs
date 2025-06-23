# Task Agent Prompts - Phase 1 Implementation

## Task 1.1: Basic Manifest V3 Extension

### Prompt for Claude Code Task Agent:

```
I need you to implement Task 1.1 from the Moose-Tabs Chrome extension project using Test-Driven Development.

CONTEXT:
- Project: Chrome extension that tracks tab hierarchies (parent-child relationships)
- Target: Manifest V3 extension with React sidebar
- Method: TDD (tests first, then implementation)
- Files exist: implementation-plan/ and memory-bank/ directories

TASK 1.1 REQUIREMENTS:
1. Write tests for extension loading and manifest validation
2. Create valid Manifest V3 manifest.json file
3. Set up background script service worker
4. Configure permissions for tabs and sidePanel APIs
5. Ensure extension loads without errors in Chrome

STEPS TO FOLLOW:
1. First, read the implementation plan: implementation-plan/implementation-plan.md
2. Create task log: memory-bank/task-logs/task-1-1-log.md (use template)
3. Write failing tests first using Jest framework
4. Create manifest.json with Manifest V3 structure
5. Create background.js service worker
6. Make tests pass
7. Test extension loading in Chrome
8. Update task log and phase-progress tracker

DELIVERABLES:
- manifest.json (valid Manifest V3)
- background.js (service worker)
- tests/ directory with unit tests
- Updated memory-bank logs

Start with TDD - write the tests first, then implement to make them pass.
```

---

## Task 1.2: Background Script & Tab Hierarchy Model

### Prompt for Claude Code Task Agent:

```
I need you to implement Task 1.2 from the Moose-Tabs Chrome extension project using Test-Driven Development.

CONTEXT:
- Task 1.1 should be completed (basic extension structure exists)
- Need to implement tab hierarchy tracking with parent-child relationships
- Method: TDD (tests first, then implementation)

TASK 1.2 REQUIREMENTS:
1. Write tests for tab hierarchy data structure and operations
2. Design tab hierarchy model (parent-child relationships)
3. Implement tab tracking in background script
4. Create functions: addTab, removeTab, updateTab, getHierarchy
5. Handle tab creation from existing tabs (detect parent-child linking)

STEPS TO FOLLOW:
1. Read existing code and implementation plan
2. Create task log: memory-bank/task-logs/task-1-2-log.md
3. Write comprehensive unit tests for:
   - Tab hierarchy data structure
   - Add/remove/update operations
   - Parent-child relationship detection
4. Implement tab hierarchy model class/object
5. Add hierarchy tracking to background script
6. Make all tests pass
7. Update memory-bank logs

TECHNICAL REQUIREMENTS:
- Use Chrome tabs API for tab information
- Store hierarchy in memory (background script)
- Handle edge cases (orphaned tabs, multiple windows)
- Maintain referential integrity

DELIVERABLES:
- Enhanced background.js with hierarchy tracking
- Tab hierarchy model implementation
- Comprehensive unit tests
- Updated memory-bank logs

Start with failing tests, then implement the minimum code to make them pass.
```

---

## Task 1.3: Listening to Tab Events

### Prompt for Claude Code Task Agent:

```
I need you to implement Task 1.3 from the Moose-Tabs Chrome extension project using Test-Driven Development.

CONTEXT:
- Tasks 1.1 and 1.2 should be completed (extension structure + hierarchy model exist)
- Need to implement Chrome tabs API event listeners
- Method: TDD (tests first, then implementation)

TASK 1.3 REQUIREMENTS:
1. Write tests for tab event handling and hierarchy updates
2. Implement Chrome tabs API event listeners:
   - chrome.tabs.onCreated
   - chrome.tabs.onUpdated
   - chrome.tabs.onRemoved
   - chrome.tabs.onMoved
3. Detect parent-child relationships when tabs are created
4. Update hierarchy model when tabs change
5. Handle edge cases (tab moves between windows)

STEPS TO FOLLOW:
1. Read existing hierarchy model code
2. Create task log: memory-bank/task-logs/task-1-3-log.md
3. Write integration tests for:
   - Event listener registration
   - Hierarchy updates on tab events
   - Parent-child detection logic
   - Edge case handling
4. Implement event listeners in background script
5. Add parent detection logic (openerTabId, etc.)
6. Make all tests pass
7. Test manually in Chrome developer tools
8. Update memory-bank logs and phase progress

TECHNICAL REQUIREMENTS:
- Use chrome.tabs API events
- Mock Chrome APIs in tests
- Maintain hierarchy integrity during updates
- Handle rapid tab changes gracefully

DELIVERABLES:
- Enhanced background.js with event listeners
- Parent-child detection logic
- Integration tests for events
- Updated memory-bank logs
- Phase 1 marked as completed

This completes Phase 1. Ensure all tests pass and the extension works in Chrome before marking complete.
```