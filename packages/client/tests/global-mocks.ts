import fetch from 'node-fetch';

// @ts-expect-error The Fetch API is not available in Expo Jest environment (which is Node.js).
// We use node-fetch polyfill and set the global reference to it.
global.fetch = fetch;

// MSW uses the LocalStorage internally. In order for MSW to work we need
// to mock the LocalStorage API.
class LocalStorageMock {
    store: Record<string, unknown> = {};

    constructor() {
        this.store = {};
    }

    clear() {
        this.store = {};
    }

    getItem(key: string) {
        return this.store[key] || null;
    }

    setItem(key: string, value: unknown) {
        this.store[key] = String(value);
    }

    removeItem(key: string) {
        delete this.store[key];
    }
}

// @ts-expect-error We need to mock localStorage API in Node.js for MSW to work
global.localStorage = new LocalStorageMock();
