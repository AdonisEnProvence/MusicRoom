#!/usr/bin/env tsm
import { $, cd, nothrow, ProcessPromise, ProcessOutput } from 'zx';
import { startTemporal, startClient } from './e2e/_functions';

let temporalDockerComposeService: ProcessPromise<ProcessOutput>;
let temporalWorkerService: ProcessPromise<ProcessOutput>;
let temporalApiService: ProcessPromise<ProcessOutput>;
let clientServerService: ProcessPromise<ProcessOutput>;

async function waitTemporal() {
    const { dockerCompose, worker, api } = await startTemporal();

    temporalDockerComposeService = nothrow(dockerCompose);
    temporalWorkerService = nothrow(worker);
    temporalApiService = nothrow(api);
}

async function waitClient() {
    const { client } = await startClient();

    clientServerService = nothrow(client);
}

async function startServices() {
    await Promise.all([waitTemporal(), waitClient()]);
}

async function stopServices() {
    await Promise.all([
        temporalDockerComposeService.kill(),
        temporalWorkerService.kill(),
        temporalApiService.kill(),
        clientServerService.kill(),
    ]);
}

async function runE2eTests() {
    cd('packages/client');

    await $`yarn test:e2e`;
}

async function script() {
    await startServices();

    await runE2eTests();

    await stopServices();
}

void script();
