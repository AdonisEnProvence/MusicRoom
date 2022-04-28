import { $, cd, fetch, ProcessOutput, ProcessPromise, sleep } from 'zx';

function startTemporalDockerCompose() {
    cd('packages/temporal/docker-compose');
    return Promise.resolve({
        dockerCompose: $`docker-compose up`,
    });
}

async function waitForTemporalToBeStarted() {
    let isStarted = false;
    while (isStarted === false) {
        let hasFailed = true;
        try {
            const namespaceResponse = await fetch(
                'http://localhost:8088/api/namespaces/default',
            );

            const isInvalidStatusCode = namespaceResponse.ok === false;
            hasFailed = isInvalidStatusCode === true;
        } catch (err) {
            hasFailed = true;
        }

        if (hasFailed === true) {
            await sleep(5_000);

            continue;
        }

        isStarted = true;
    }
}

async function startTemporalWorkerAfterDelay() {
    // Wait for Temporal server to start
    await waitForTemporalToBeStarted();

    cd('packages/temporal');
    return {
        worker: $`env-cmd yarn worker:launch`,
    };
}

async function startTemporalApiAfterDelay() {
    // Wait for Temporal server to start
    await waitForTemporalToBeStarted();

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

async function startServerDockerCompose() {
    cd('packages/server');
    return Promise.resolve({
        dockerCompose: $`docker-compose up`,
    });
}

async function startServerApiAfterDelay() {
    cd('packages/server');
    await $`yarn build`;

    // Wait for server services to start
    await sleep(10_000);

    cd('packages/server');
    await $`env-cmd -f ./.env.testing yarn setup:database`;

    cd('packages/server');
    return {
        api: $`env-cmd -f .env.testing yarn start`,
    };
}

export async function startServer(): Promise<{
    api: ProcessPromise<ProcessOutput>;
    dockerCompose: ProcessPromise<ProcessOutput>;
}> {
    return {
        ...(await startServerDockerCompose()),
        ...(await startServerApiAfterDelay()),
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
