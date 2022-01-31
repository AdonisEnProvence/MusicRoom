import Database from '@ioc:Adonis/Lucid/Database';
import {
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, random } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

test.group('User settings', (group) => {
    const { disconnectEveryRemainingSocketConnection, initSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test(`'PUBLIC' is the default setting for playlists, relations and devices visibility settings`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });

        await user.load('playlistsVisibilitySetting');
        await user.load('relationsVisibilitySetting');
        await user.load('devicesVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'PUBLIC',
        );

        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'PUBLIC',
        );

        assert.equal<UserSettingVisibility>(
            user.devicesVisibilitySetting.name,
            'PUBLIC',
        );
    });

    test(`Can set playlists visibility to 'PUBLIC'`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            tmpAuthUserID: userID,
            visibility: 'PUBLIC',
        };

        const { body: rawResponseBody } = await supertest(BASE_URL)
            .post('/me/playlists-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdatePlaylistsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.load('playlistsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'PUBLIC',
        );
    });

    test(`Can set playlists visibility to 'PRIVATE'`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            tmpAuthUserID: userID,
            visibility: 'PRIVATE',
        };

        const { body: rawResponseBody } = await supertest(BASE_URL)
            .post('/me/playlists-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdatePlaylistsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.refresh();
        await user.load('playlistsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'PRIVATE',
        );
    });

    test(`Can set playlists visibility to 'FOLLOWERS_ONLY'`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
        });

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            tmpAuthUserID: userID,
            visibility: 'FOLLOWERS_ONLY',
        };

        const { body: rawResponseBody } = await supertest(BASE_URL)
            .post('/me/playlists-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdatePlaylistsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.refresh();
        await user.load('playlistsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'FOLLOWERS_ONLY',
        );
    });
});
