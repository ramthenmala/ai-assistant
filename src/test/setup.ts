import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI for testing
Object.defineProperty(window, 'electronAPI', {
  value: undefined,
  writable: true,
});

// Mock crypto.randomUUID for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
  },
});

// Mock scrollIntoView for testing
Element.prototype.scrollIntoView = vi.fn();

// Mock Intl.DateTimeFormat for consistent timestamp formatting in tests
const mockDateTimeFormat = vi.fn().mockImplementation(() => ({
  format: vi.fn().mockReturnValue('12:00 PM')
}));

Object.defineProperty(global, 'Intl', {
  value: {
    ...global.Intl,
    DateTimeFormat: mockDateTimeFormat,
  },
  writable: true,
});