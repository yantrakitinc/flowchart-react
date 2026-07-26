import '@testing-library/jest-dom';

/**
 * React Flow relies on a few browser APIs that jsdom does not implement. Provide minimal
 * mocks so the canvas can mount during tests.
 */
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
// @ts-expect-error — assigning a mock onto the global.
global.ResizeObserver = ResizeObserverMock;

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
    this.m22 = scale !== undefined ? +scale : 1;
  }
}
// @ts-expect-error — assigning a mock onto the global.
global.DOMMatrixReadOnly = DOMMatrixReadOnlyMock;

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
  offsetWidth: { get() { return 800; }, configurable: true },
  offsetHeight: { get() { return 600; }, configurable: true },
});
