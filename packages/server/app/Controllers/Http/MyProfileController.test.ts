import Database from '@ioc:Adonis/Lucid/Database';
import { GetMyProfileInformationResponseBody } from '@musicroom/types';
import test from 'japa';
import sinon from 'sinon';
import urlcat from 'urlcat';
import {
    initTestUtils,
    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
} from '../../../tests/utils/TestUtils';

test.group('MyProfileController', (group) => {
    const {
        createSocketConnection,
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
        createUserAndAuthenticate,
        createRequest,
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

    test('Retrieves profile information of the current authenticated user', async (assert) => {
        const request = createRequest();

        const user = await createUserAndAuthenticate(request);
        await createSocketConnection({
            userID: user.uuid,
        });
        await createSocketConnection({
            userID: user.uuid,
        });

        const { body: rawBody } = await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(200);

        const parsedBody = GetMyProfileInformationResponseBody.parse(rawBody);
        const expectedBody: GetMyProfileInformationResponseBody = {
            devicesCounter: 2,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: 0,
            userID: user.uuid,
            userNickname: user.nickname,
        };
        assert.deepEqual(parsedBody, expectedBody);
    });

    test('Returns a 401 error when the current user is unauthenticated', async () => {
        const request = createRequest();

        await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(401);
    });

    test('Sends back a 500 error as current user has no active device', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        await request
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .expect(500);
    });
});
