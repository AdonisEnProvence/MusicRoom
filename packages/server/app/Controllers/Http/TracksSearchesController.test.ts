import Database from '@ioc:Adonis/Lucid/Database';
import test from 'japa';
import Sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from '../../../tests/utils/TestUtils';

test.group('TracksSearchesController', (group) => {
    const {
        createUserAndAuthenticate,
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        Sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('Tracks can not be searched by an unauthenticated user', async () => {
        const request = supertest.agent(BASE_URL);

        await request.get('/search/track/Biolay').expect(401);
    });

    test('It should fail to search a track as I ve not confirmed my email', async () => {
        const request = supertest.agent(BASE_URL);
        const emailIsNotConfirmed = true;
        await createUserAndAuthenticate(request, emailIsNotConfirmed);

        await request.get('/search/track/Biolay').expect(403);
    });
});
