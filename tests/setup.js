import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
});
