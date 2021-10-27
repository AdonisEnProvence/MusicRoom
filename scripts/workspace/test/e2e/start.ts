#!/usr/bin/env tsm
import { $, cd, sleep } from 'zx';

async function startTemporalDockerCompose() {
    cd('packages/temporal/docker-compose');
    return await $`docker-compose up`;
}

async function startTemporalWorkerAfterDelay() {
    // Wait for Temporal server to start
    await sleep(10_000);

    cd('packages/temporal');
    return await $`env-cmd yarn worker:launch`;
}

async function startTemporalApiAfterDelay() {
    // Wait for Temporal server to start
    await sleep(10_000);

    cd('packages/temporal');
    return await $`env-cmd yarn api:launch`;
}

async function startTemporal() {
    cd('packages/temporal');
    await Promise.all([$`yarn worker:build`, $`yarn api:build`]);

    return Promise.all([
        startTemporalDockerCompose(),
        startTemporalWorkerAfterDelay(),
        startTemporalApiAfterDelay(),
    ]);
}

async function startClient() {
    cd('packages/client');
    await $`yarn web:production:build`;

    cd('packages/client');
    return await $`yarn web:production:serve`;
}

async function startServices() {
    await Promise.all([startTemporal(), startClient()]);
}

void startServices();
