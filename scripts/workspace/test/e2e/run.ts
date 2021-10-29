#!/usr/bin/env tsm
import { $, cd } from 'zx';

async function runE2eTests() {
    cd('packages/client');
    await $`yarn test:e2e`;
}

void runE2eTests();
