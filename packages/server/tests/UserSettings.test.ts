import Database from '@ioc:Adonis/Lucid/Database';
import {
    GetMySettingsResponseBody,
    UpdateNicknameRequestBody,
    UpdateNicknameResponseBody,
    UpdateNicknameResponseStatus,
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import SettingVisibility from 'App/Models/SettingVisibility';
import User from 'App/Models/User';
import { datatype, random, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { initTestUtils } from './utils/TestUtils';

test.group('User settings', (group) => {
    const {
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createRequest,
        createUserAndAuthenticate,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        sinon.restore();
        await Database.rollbackGlobalTransaction();
    });

    test('Gets my settings', async (assert) => {
        const request = createRequest();

        const privateVisibilitySetting = await SettingVisibility.findByOrFail(
            'name',
            UserSettingVisibility.enum.PRIVATE,
        );
        const followersOnlyVisibilitySetting =
            await SettingVisibility.findByOrFail(
                'name',
                UserSettingVisibility.enum.FOLLOWERS_ONLY,
            );
        const user = await createUserAndAuthenticate(request);
        await user
            .related('playlistsVisibilitySetting')
            .associate(privateVisibilitySetting);
        await user
            .related('relationsVisibilitySetting')
            .associate(followersOnlyVisibilitySetting);

        const { body: rawResponseBody } = await request
            .get('/me/settings')
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody = GetMySettingsResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.nickname, user.nickname);
        assert.equal<UserSettingVisibility>(
            responseBody.playlistsVisibilitySetting,
            'PRIVATE',
        );
        assert.equal<UserSettingVisibility>(
            responseBody.relationsVisibilitySetting,
            'FOLLOWERS_ONLY',
        );
    });

    test("Prevents to get current user's settings when she is not authenticated", async () => {
        const request = createRequest();

        await request.get('/me/settings').expect(401);
    });

    test(`'PUBLIC' is the default setting for playlists, relations and devices visibility settings`, async (assert) => {
        const userID = datatype.uuid();
        const user = await User.create({
            uuid: userID,
            nickname: random.word(),
            email: internet.email(),
            password: internet.password(),
        });

        await user.load((loader) => {
            loader
                .load('playlistsVisibilitySetting')
                .load('relationsVisibilitySetting');
        });

        assert.equal<UserSettingVisibility>(
            user.playlistsVisibilitySetting.name,
            'PUBLIC',
        );
        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'PUBLIC',
        );
    });

    test("Prevents to set user's playlists visibility when she is not authenticated", async () => {
        const request = createRequest();

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            visibility: 'PUBLIC',
        };
        await request
            .post('/me/playlists-visibility')
            .send(requestBody)
            .expect(401);
    });

    test(`Can set playlists visibility to 'PUBLIC'`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            visibility: 'PUBLIC',
        };
        const { body: rawResponseBody } = await request
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
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            visibility: 'PRIVATE',
        };
        const { body: rawResponseBody } = await request
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
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdatePlaylistsVisibilityRequestBody = {
            visibility: 'FOLLOWERS_ONLY',
        };
        const { body: rawResponseBody } = await request
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

    test("Prevents to set user's relations visibility when she is not authenticated", async () => {
        const request = createRequest();

        const requestBody: UpdateRelationsVisibilityRequestBody = {
            visibility: 'PUBLIC',
        };
        await request
            .post('/me/relations-visibility')
            .send(requestBody)
            .expect(401);
    });

    test(`Can set relations visibility to 'PUBLIC'`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdateRelationsVisibilityRequestBody = {
            visibility: 'PUBLIC',
        };

        const { body: rawResponseBody } = await request
            .post('/me/relations-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdateRelationsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.load('relationsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'PUBLIC',
        );
    });

    test(`Can set relations visibility to 'PRIVATE'`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdateRelationsVisibilityRequestBody = {
            visibility: 'PRIVATE',
        };

        const { body: rawResponseBody } = await request
            .post('/me/relations-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdateRelationsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.refresh();
        await user.load('relationsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'PRIVATE',
        );
    });

    test(`Can set relations visibility to 'FOLLOWERS_ONLY'`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);

        const requestBody: UpdateRelationsVisibilityRequestBody = {
            visibility: 'FOLLOWERS_ONLY',
        };

        const { body: rawResponseBody } = await request
            .post('/me/relations-visibility')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody =
            UpdateRelationsVisibilityResponseBody.parse(rawResponseBody);

        assert.equal(responseBody.status, 'SUCCESS');

        await user.refresh();
        await user.load('relationsVisibilitySetting');

        assert.equal<UserSettingVisibility>(
            user.relationsVisibilitySetting.name,
            'FOLLOWERS_ONLY',
        );
    });

    test("Prevents to set user's nickname when she is not authenticated", async () => {
        const request = createRequest();

        const requestBody: UpdateNicknameRequestBody = {
            nickname: 'new nickname',
        };
        await request.post('/me/nickname').send(requestBody).expect(401);
    });

    test(`Returns an error when trying to update user's nickname with her current nickname`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);
        const initialNickname = user.nickname;

        const requestBody: UpdateNicknameRequestBody = {
            nickname: initialNickname,
        };
        const { body: rawResponseBody } = await request
            .post('/me/nickname')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody = UpdateNicknameResponseBody.parse(rawResponseBody);

        assert.equal<UpdateNicknameResponseStatus>(
            responseBody.status,
            'SAME_NICKNAME',
        );

        await user.refresh();

        assert.equal(user.nickname, initialNickname);
    });

    test(`Returns an error when trying to update user's nickname with an unavailable nickname`, async (assert) => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        const randomUser = await User.create({
            uuid: datatype.uuid(),
            nickname: random.word(),
            email: internet.email(),
            password: internet.password(),
        });

        const requestBody: UpdateNicknameRequestBody = {
            nickname: randomUser.nickname,
        };
        const { body: rawResponseBody } = await request
            .post('/me/nickname')
            .send(requestBody)
            .expect(400)
            .expect('Content-Type', /json/);
        const responseBody = UpdateNicknameResponseBody.parse(rawResponseBody);

        assert.equal<UpdateNicknameResponseStatus>(
            responseBody.status,
            'UNAVAILABLE_NICKNAME',
        );

        // We can not refresh the user because the transaction has failed,
        // as we violated a unique constraint, and Postgres does not allow
        // to make additional requests on a transaction that has been aborted.
        // See: https://stackoverflow.com/questions/10399727/psqlexception-current-transaction-is-aborted-commands-ignored-until-end-of-tra.
    });

    test(`Returns an error when trying to set username as an empty string`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);
        const initialNickname = user.nickname;

        const requestBody: UpdateNicknameRequestBody = {
            nickname: '',
        };
        await request.post('/me/nickname').send(requestBody).expect(500);

        await user.refresh();

        assert.equal(user.nickname, initialNickname);
    });

    test(`Updates user's nickname`, async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);
        const newNickname = random.words();

        const requestBody: UpdateNicknameRequestBody = {
            nickname: newNickname,
        };
        const { body: rawResponseBody } = await request
            .post('/me/nickname')
            .send(requestBody)
            .expect(200)
            .expect('Content-Type', /json/);
        const responseBody = UpdateNicknameResponseBody.parse(rawResponseBody);

        assert.equal<UpdateNicknameResponseStatus>(
            responseBody.status,
            'SUCCESS',
        );

        await user.refresh();

        assert.equal(user.nickname, newNickname);
    });
});
