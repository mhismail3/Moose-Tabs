import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { DropZoneProvider } from '../src/components/context/DropZoneContext';

// Test wrapper that provides DropZoneContext
export function renderWithDropZoneProvider(ui, options = {}) {
  function Wrapper({ children }) {
    return <DropZoneProvider>{children}</DropZoneProvider>;
  }
  
  return render(ui, { wrapper: Wrapper, ...options });
}

// Wrapper for renderHook with DropZoneProvider
export function renderHookWithDropZoneProvider(hook, options = {}) {
  const Wrapper = ({ children }) => {
    return <DropZoneProvider>{children}</DropZoneProvider>;
  };
  
  return renderHook(hook, { wrapper: Wrapper, ...options });
}

// Export everything from testing-library/react for convenience
export * from '@testing-library/react';