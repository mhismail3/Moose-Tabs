import React from 'react';
import { createRoot } from 'react-dom/client';
import SettingsApp from './SettingsApp';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('settings-root');
  if (container) {
    const root = createRoot(container);
    root.render(<SettingsApp />);
  } else {
    console.error('Settings root container not found');
  }
});

// Also support if the script loads after DOMContentLoaded
if (document.readyState === 'loading') {
  // DOM hasn't finished loading yet
} else {
  // DOM is ready
  const container = document.getElementById('settings-root');
  if (container) {
    const root = createRoot(container);
    root.render(<SettingsApp />);
  }
}