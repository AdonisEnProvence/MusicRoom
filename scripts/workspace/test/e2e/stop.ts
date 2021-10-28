#!/usr/bin/env tsm
import { $, cd } from 'zx';

async function stopTemporalDockerCompose() {
    cd('packages/temporal/docker-compose');
    await $`docker compose down`;
}

async function stopServerDockerCompose() {
    cd('packages/server');
    await $`docker compose down`;
}

async function stopServices() {
    await Promise.all([stopTemporalDockerCompose(), stopServerDockerCompose()]);
}

void stopServices();
