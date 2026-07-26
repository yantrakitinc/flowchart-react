import '@testing-library/jest-dom';

/**
 * React Flow depends on a handful of browser APIs jsdom does not implement.
 * These minimal mocks let the canvas mount under vitest + jsdom.
 */
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = /scale\(([0-9.]+)\)/.exec(transform ?? '')?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

// jsdom lacks these globals; assign the mocks without fighting the DOM lib types
// (Object.assign avoids @ts-expect-error directives that flip used/unused as deps change).
Object.assign(globalThis, {
  ResizeObserver: ResizeObserverMock,
  DOMMatrixReadOnly: DOMMatrixReadOnlyMock,
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { get: () => 800, configurable: true },
  offsetHeight: { get: () => 600, configurable: true },
});
