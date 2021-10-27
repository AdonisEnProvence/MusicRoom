#!/usr/bin/env tsm
import { $, cd } from 'zx';

async function stopTemporalDockerCompose() {
    cd('packages/temporal/docker-compose');
    await $`docker compose down`;
}

void stopTemporalDockerCompose();
