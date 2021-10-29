#!/usr/bin/env tsm
import { startTemporal, startClient, startServer } from './_functions';

async function waitTemporal() {
    const { dockerCompose, worker, api } = await startTemporal();

    return await Promise.all([dockerCompose, worker, api]);
}

async function waitServer() {
    const { dockerCompose, api } = await startServer();

    return await Promise.all([dockerCompose, api]);
}

async function waitClient() {
    const { client } = await startClient();

    return await client;
}

async function startServices() {
    await Promise.all([waitTemporal(), waitServer(), waitClient()]);
}

void startServices();
