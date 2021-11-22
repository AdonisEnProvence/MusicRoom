import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    testMatch: 'e2e/**/*.spec.ts',
    workers: 1,
    use: {
        headless: false,
        baseURL: 'http://localhost:4000',
        viewport: {
            height: 824,
            width: 1024,
        },
    },
    timeout: 120_000,
};

export default config;
