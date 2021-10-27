#!/usr/bin/env tsm
import { startTemporal, startClient } from './_functions';

async function waitTemporal() {
    const { dockerCompose, worker, api } = await startTemporal();

    return await Promise.all([dockerCompose, worker, api]);
}

async function waitClient() {
    const { client } = await startClient();

    return await client;
}

async function startServices() {
    await Promise.all([waitTemporal(), waitClient()]);
}

void startServices();
