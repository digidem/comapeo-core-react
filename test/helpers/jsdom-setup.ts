/**
 * Sets up minimal DOM globals needed for React rendering in
 * `@vitest-environment node` test files.
 *
 * Import as a side-effect: `import '../helpers/jsdom-setup.js'`
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'http://localhost',
	pretendToBeVisual: true,
})
globalThis.document = dom.window.document
globalThis.window = dom.window as unknown as Window & typeof globalThis
// navigator is a getter-only property in newer Node.js versions, so use defineProperty
Object.defineProperty(globalThis, 'navigator', {
	value: dom.window.navigator,
	writable: true,
	configurable: true,
})
