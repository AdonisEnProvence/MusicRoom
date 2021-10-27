import { $, cd, ProcessOutput, ProcessPromise, sleep } from 'zx';

function startTemporalDockerCompose() {
    cd('packages/temporal/docker-compose');
    return Promise.resolve({
        dockerCompose: $`docker-compose up`,
    });
}

async function startTemporalWorkerAfterDelay() {
    // Wait for Temporal server to start
    await sleep(10_000);

    cd('packages/temporal');
    return {
        worker: $`env-cmd yarn worker:launch`,
    };
}

async function startTemporalApiAfterDelay() {
    // Wait for Temporal server to start
    await sleep(10_000);

    cd('packages/temporal');
    return {
        api: $`env-cmd yarn api:launch`,
    };
}

export async function startTemporal(): Promise<{
    dockerCompose: ProcessPromise<ProcessOutput>;
    worker: ProcessPromise<ProcessOutput>;
    api: ProcessPromise<ProcessOutput>;
}> {
    cd('packages/temporal');
    await Promise.all([$`yarn worker:build`, $`yarn api:build`]);

    return {
        ...(await startTemporalDockerCompose()),
        ...(await startTemporalWorkerAfterDelay()),
        ...(await startTemporalApiAfterDelay()),
    };
}

export async function startClient(): Promise<{
    client: ProcessPromise<ProcessOutput>;
}> {
    cd('packages/client');
    await $`yarn web:production:build`;

    cd('packages/client');
    return {
        client: $`yarn web:production:serve`,
    };
}
