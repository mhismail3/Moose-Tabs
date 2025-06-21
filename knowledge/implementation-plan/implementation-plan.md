# Moose-Tabs: Test-Driven Implementation Plan

This document outlines a detailed, test-driven implementation plan for the Moose-Tabs Chrome extension. The plan is structured to be executed by a coding agent system. Each task should be completed by first writing a failing test, then writing the code to make the test pass, and finally refactoring.

## Phase 1: Core Extension Setup & Background Logic

### Task 1.1: Basic Manifest V3 Extension
-   **TDD Task:** Create a test that checks if the `manifest.json` file is valid, has the correct `manifest_version`, `name`, and `version`.
-   **Implementation Task:** Create a `public/manifest.json` file for a Chrome extension using Manifest V3. Define the name, version, and a placeholder description. Add a background service worker.

### Task 1.2: Background Script & Tab Hierarchy Model
-   **TDD Task:** Write a unit test for a `TabTree` class. Test adding a root tab and a child tab. The test should verify the parent-child relationship.
-   **Implementation Task:** Create `src/background/TabTree.js`. Implement a class or module that will manage the tab hierarchy. It should have methods to add, remove, and move nodes.

### Task 1.3: Listening to Tab Events
-   **TDD Task:** Write an integration test for the background script. Use a testing framework for Chrome extensions to simulate creating a new tab and verify that the `onCreated` event is handled and the tab is added to the `TabTree`.
-   **Implementation Task:** In `src/background/background.js`, add listeners for `chrome.tabs.onCreated`, `chrome.tabs.onRemoved`, and `chrome.tabs.onMoved`. These listeners should update the `TabTree` instance.

## Phase 2: Sidebar UI with React

### Task 2.1: Basic React App in Sidebar
-   **TDD Task:** Write a test to check if the React application renders a basic "Hello Moose-Tabs" message in the sidebar.
-   **Implementation Task:** Set up a React application in the `src` directory. Configure the `manifest.json` to use `chrome.sidePanel` and point it to an `index.html` that loads the React app.

### Task 2.2: Displaying the Tab Tree
-   **TDD Task:** Write a component test for `TabTreeComponent`. Mock the `TabTree` data and verify that the component renders a list of tabs with correct indentation for parent-child relationships.
-   **Implementation Task:** Create a `TabTreeComponent` in React. It should get the tab hierarchy from the background script (initially via a message, later via a shared state).

### Task 2.3: Real-time UI Updates
-   **TDD Task:** Write a test that simulates a tab being added in the background and verifies that the `TabTreeComponent` updates to show the new tab.
-   **Implementation Task:** Implement a communication channel between the background script and the sidebar UI (e.g., using `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`). When the `TabTree` in the background changes, it should push the updated tree to the UI.

## Phase 3: Advanced Features

### Task 3.1: Collapse/Expand Tab Branches
-   **TDD Task:** Write a component test for a `TabItem` component. The test should simulate a click on the expand/collapse icon and verify that the child tabs are shown/hidden.
-   **Implementation Task:** In the `TabItem` component, add state to manage the collapsed/expanded status. Add a button to toggle this state.

### Task 3.2: Multi-Window Sync
-   **TDD Task:** Write an end-to-end test that opens two browser windows, creates tabs in both, and verifies that the sidebar in each window shows the complete and correct tab tree from both windows.
-   **Implementation Task:** Ensure the background script's `TabTree` is the single source of truth. The background script should handle tabs from all windows. All open sidebars should listen for updates from the single background `TabTree`.

### Task 3.3: Drag-and-Drop Reordering
-   **TDD Task:** Write a test for the `TabTreeComponent` that simulates a drag-and-drop action to reorder a tab. Verify that the component sends the correct "move" command to the background script.
-   **Implementation Task:** Implement drag-and-drop functionality using a library like `react-dnd`. The drop handler will call `chrome.tabs.move` and update the internal `TabTree`.

## Phase 4: Polish and Finalization

### Task 4.1: Theming (Light/Dark Mode)
-   **TDD Task:** Write a test that toggles a theme switch and verifies that the CSS classes for the theme are applied to the main container.
-   **Implementation Task:** Create CSS variables for colors. Implement a theme toggle that switches between light and dark theme class names on the root component.

### Task 4.2: Internationalization (i18n)
-   **TDD Task:** Write a test that changes the language and verifies that a specific UI element displays text in the selected language.
-   **Implementation Task:** Externalize all strings into `_locales/en/messages.json`. Use `chrome.i18n.getMessage()` to display text. Add at least one other language (e.g., `es`).

### Task 4.3: Accessibility (ARIA roles & Keyboard Navigation)
-   **TDD Task:** Write a test to check for the presence of `role="tree"` and `role="treeitem"` ARIA attributes on the tab tree components. Write another test to simulate keyboard navigation (arrow keys) and verify focus changes correctly.
-   **Implementation Task:** Add appropriate ARIA roles to the `TabTreeComponent` and `TabItem` components. Implement keyboard event handlers for navigation. 