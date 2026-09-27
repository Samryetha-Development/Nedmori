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

// Node 25 defines `globalThis.localStorage` as a stub (it needs --localstorage-file to work),
// and it wins over jsdom's Storage. Back jsdom's Storage.prototype with a Map instead, so
// `localStorage` is usable and tests can still stub `Storage.prototype.setItem`.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const entries = new Map();
  Object.defineProperties(Storage.prototype, {
    length: { configurable: true, get() { return entries.size; } },
    key: { configurable: true, writable: true, value: function (index) { return [...entries.keys()][index] ?? null; } },
    getItem: { configurable: true, writable: true, value: function (key) { return entries.has(String(key)) ? entries.get(String(key)) : null; } },
    setItem: { configurable: true, writable: true, value: function (key, value) { entries.set(String(key), String(value)); } },
    removeItem: { configurable: true, writable: true, value: function (key) { entries.delete(String(key)); } },
    clear: { configurable: true, writable: true, value: function () { entries.clear(); } },
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: Object.create(Storage.prototype) });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
});
