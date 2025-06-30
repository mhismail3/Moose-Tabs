import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { DropZoneProvider } from '../src/components/context/DropZoneContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';

// Setup global Chrome API mock if not already present
if (!global.chrome) {
  global.chrome = {
    runtime: {
      sendMessage: jest.fn(() => Promise.resolve({ success: true })),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    storage: {
      local: {
        get: jest.fn(() => Promise.resolve({})),
        set: jest.fn(() => Promise.resolve())
      }
    }
  };
}

// Test wrapper that provides both DropZoneContext and SettingsContext
export function renderWithDropZoneProvider(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <SettingsProvider>
        <DropZoneProvider>
          {children}
        </DropZoneProvider>
      </SettingsProvider>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...options });
}

// Wrapper for renderHook with both providers
export function renderHookWithDropZoneProvider(hook, options = {}) {
  const Wrapper = ({ children }) => {
    return (
      <SettingsProvider>
        <DropZoneProvider>
          {children}
        </DropZoneProvider>
      </SettingsProvider>
    );
  };
  
  return renderHook(hook, { wrapper: Wrapper, ...options });
}

// Test wrapper that provides all necessary contexts
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <SettingsProvider>
        <DropZoneProvider>
          {children}
        </DropZoneProvider>
      </SettingsProvider>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...options });
}

// Export everything from testing-library/react for convenience
export * from '@testing-library/react';