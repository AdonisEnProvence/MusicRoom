import execa from 'execa';
import getPort from 'get-port';
import { configure } from 'japa';
import { join } from 'path';
import 'reflect-metadata';
import sourceMapSupport from 'source-map-support';

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

/**
 * Configure test runner
 */
configure({
    files: ['**/*.test.ts'],
    before: [runMigrations, startHttpServer],
    after: [rollbackMigrations],
    timeout: 5_000,
});
