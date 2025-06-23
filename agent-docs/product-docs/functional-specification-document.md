## Business Logic

- Tab Hierarchy Management: On startup, the background script gathers all open tabs (across all
windows) via chrome.tabs.query. It builds an internal tree structure mapping each tab’s ID to its
parent ID (using Chrome’s openerTabId when available for same-window links). Tabs without a
parent are treated as root nodes (or roots per window).
- Real-time Updates: The extension listens to tab events (via chrome.tabs.onCreated,
onRemoved, onMoved, onUpdated, etc.). When a new tab is created, if it has an opener, it is
added as a child of that opener in the tree; if not, it’s a new root in that window. When a tab is closed,
its children are either promoted to the closed tab’s parent (if any) or become new roots (avoiding
orphans). Moving a tab (between windows or within a window) updates its position in the hierarchy
accordingly.
- Sidebar UI Sync: A background service (or logic in each UI instance) keeps the sidebar tree in each
open window updated. For multi-window support, the background acts as single source of truth for
the tab tree. It communicates changes to all open side panel instances (e.g. via
chrome.runtime.sendMessage or a chrome.storage.onChanged event if using storage for
state). This ensures that expanding/collapsing or reordering in one window’s sidebar reflects in
others.
- User Actions (Drag-and-Drop, Collapse): Dragging a tab in the UI triggers logic: if dropped onto
another tab, it becomes a child (uses chrome.tabs.move to reattach in Chrome’s tab bar, possibly
creating a new window if necessary). Reordering within the same level calls chrome.tabs.move to
new index. Collapsing a branch is a purely front-end state change (the extension remembers
collapsed states in memory or storage, so collapsed branches persist). Collapsing/expanding does
not close tabs, only hides their children in the UI.
- Tab Activation & Navigation: Clicking a tab node in the tree calls chrome.tabs.update(tabId, {active: true}) to switch focus to that tab (and optionally chrome.windows.update to focus the window if needed). The extension highlights the active tab in the tree for context. If the user closes a tab via the tree UI, it calls chrome.tabs.remove(tabId) to close it and then updates the tree.
- State Persistence: The extension may store the tab tree state (especially collapsed/expanded flags and perhaps custom user settings) in chrome.storage.local so that if the extension or browser reloads, it can restore the last known hierarchy state. (Actual open tabs info is always taken from Chrome directly; stored state is mainly for UI preferences or when Chrome fails to provide opener
relationships across sessions).

## Data Requirements

- Internal Data Structures: The extension maintains an in-memory representation of the tab tree (e.g. a dictionary of { tabId: { parent: parentId, children: [...] } ). This is updated live as tabs open/close/move. It also tracks which branches are collapsed (e.g. a set of tab IDs that are currently collapsed).
- Chrome APIs (Data Sources): The primary data comes from Chrome’s extension APIs – no external web APIs are needed. Data includes: list of current tabs ( chrome.tabs.query returns tab objects), tab events (providing tab IDs and properties), window info ( chrome.windows.getAll for multi-window context). The extension uses these to know which tabs exist and how to structure them.
- Local Storage: Use chrome.storage.local (or sessionStorage in background) to save user
preferences such as last UI theme, collapsed states, or user-defined settings. This storage can also be a channel to sync state across multiple side panel instances on the same machine (since storage.local changes can be observed by all instances). The data stored is lightweight (e.g. a few KB for state). No data is stored remotely or synced via chrome.storage.sync (to avoid cross-device syncing per requirement).
- Internationalization Data: Text for UI labels, tooltips, and messages are stored in locale JSON files under _locales/*/messages.json. These files serve as the data source for all display text, allowing runtime selection of the appropriate language via Chrome’s i18n API.
- No External Backend: There are no external databases or servers required. All necessary data (tab structure, settings) is handled within the browser via the extension APIs. This simplifies privacy and offline use. The extension also does not require login or user account data.

## APIs for LLM Usage
- Not Applicable: There is no LLM or AI component in this extension. All logic is deterministic and based on user actions and browser tab events. No calls to AI services are planned, and no natural language processing is needed for core features. (All features revolve around tab management UI and Chrome’s built-in capabilities.)