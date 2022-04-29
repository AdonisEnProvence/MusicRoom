import { join } from 'path';
import execa from 'execa';
import getPort from 'get-port';
import { configure } from 'japa';
import 'reflect-metadata';
import sourceMapSupport from 'source-map-support';
import faker from 'faker';

process.env.NODE_ENV = 'testing';
process.env.ADONIS_ACE_CWD = join(__dirname);
sourceMapSupport.install({ handleUncaughtExceptions: false });

async function startHttpServer() {
    const { Ignitor } = await import('@adonisjs/core/build/src/Ignitor');
    process.env.PORT = String(await getPort());
    await new Ignitor(__dirname).httpServer().start();
}

async function runMigrations() {
    await execa.node('ace', ['migration:run'], {
        stdio: 'inherit',
    });
}

async function rollbackMigrations() {
    await execa.node('ace', ['migration:rollback', '--batch', '0'], {
        stdio: 'inherit',
    });
}

faker.seed(42);

/**
 * Configure test runner
 */
configure({
    files: ['**/*.test.ts'],
    before: [rollbackMigrations, runMigrations, startHttpServer],
    after: [rollbackMigrations],
    timeout: 15_000,
});
