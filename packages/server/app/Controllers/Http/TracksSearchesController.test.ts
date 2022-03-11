import Database from '@ioc:Adonis/Lucid/Database';
import test from 'japa';
import supertest from 'supertest';
import { BASE_URL } from '../../../tests/utils/TestUtils';

test.group('TracksSearchesController', (group) => {
    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });

    test('Tracks can not be searched by an unauthenticated user', async () => {
        const request = supertest.agent(BASE_URL);

        await request.get('/search/track/Biolay').expect(401);
    });
});
