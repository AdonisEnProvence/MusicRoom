#!/usr/bin/env tsm
import { $, cd, sleep, nothrow, ProcessPromise, ProcessOutput, fs } from 'zx';

let temporalService: ProcessPromise<ProcessOutput>;
let temporalWorker: ProcessPromise<ProcessOutput>;
let temporalApi: ProcessPromise<ProcessOutput>;
let clientServer: ProcessPromise<ProcessOutput>;

async function startTemporal() {
    cd('packages/temporal/docker-compose');

    temporalService = nothrow(
        $`docker-compose up`.pipe(fs.createWriteStream('/dev/null')),
    );

    // Wait 10 seconds for Temporal to launch
    await Promise.all([sleep(10_000), $`yarn worker:build`, $`yarn api:build`]);

    temporalWorker = nothrow($`yarn worker:launch`);
    temporalApi = nothrow($`yarn api:launch`);
}

async function startClient() {
    cd('packages/client');

    await $`yarn web:production:build`;

    clientServer = nothrow($`yarn web:production:serve`);
}

async function startServices() {
    await Promise.all([startTemporal(), startClient()]);
}

async function stopServices() {
    await temporalService.kill();
    await temporalWorker.kill();
    await temporalApi.kill();
    await clientServer.kill();
}

async function runE2eTests() {
    await sleep(10_000);

    await $`echo run tests`;
}

async function script() {
    await startServices();

    await runE2eTests();

    await stopServices();
}

void script();
