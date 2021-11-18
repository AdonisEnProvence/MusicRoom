import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    testMatch: 'e2e/**/*.spec.ts',
    workers: 1,
    use: {
        headless: false,
        baseURL: 'http://localhost:4000',
    },
};

export default config;
