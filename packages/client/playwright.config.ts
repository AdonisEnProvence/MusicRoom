import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    testMatch: 'e2e/**/*.spec.ts',
    use: {
        headless: false,
        baseURL: 'http://localhost:4000',
    },
};

export default config;
