// Mock react-dnd for testing
import React from 'react';

export const DndProvider = ({ children }) => React.createElement('div', {}, children);

export const useDrag = jest.fn(() => [
  { isDragging: false },
  jest.fn(), // drag ref
]);

export const useDrop = jest.fn(() => [
  { isOver: false, canDrop: true },
  jest.fn(), // drop ref
]);