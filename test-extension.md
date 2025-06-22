# Manual Testing Guide for Moose-Tabs Extension

## Prerequisites
1. Load extension in Chrome (see instructions above)
2. Open Chrome DevTools (F12) → Console tab
3. Enable extension console logging

## Test Scenarios

### 1. Basic Tab Hierarchy
- Open a new tab from current tab (Ctrl+Click link or Ctrl+T)
- Check console for: `Tab added to hierarchy: [tab info]`
- Verify parent-child relationship logged

### 2. Multi-Level Hierarchy  
- Create tab A
- From tab A, create tab B
- From tab B, create tab C
- Check console for 3-level hierarchy

### 3. Tab Removal
- Close a parent tab
- Check console: children should become root tabs
- Verify hierarchy integrity maintained

### 4. Side Panel
- Click extension icon
- Side panel should open with basic HTML
- Check for any console errors

### 5. Background Script Health
- Check console for initialization messages:
  - "Extension installed/started"
  - "Initializing with existing tabs"
  - Tab event logs

## Expected Console Output
```
Extension installed/started, initializing...
Initializing with 3 existing tabs
Tab added to hierarchy: {id: 123, title: "...", parentId: null}
Tab hierarchy updated - broadcasting to UI
```

## Debugging
- If no console logs: Check extension loaded correctly
- If hierarchy broken: Reload extension and test again
- If side panel won't open: Check manifest.json permissions