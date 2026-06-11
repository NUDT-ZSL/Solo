import '@testing-library/jest-dom/vitest';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  };
}
