import Database from '@ioc:Adonis/Lucid/Database';
import { GetMyProfileInformationResponseBody } from '@musicroom/types';
import { datatype, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    getSocketApiAuthToken,
    initTestUtils,
    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
} from '../../../tests/utils/TestUtils';

test.group('MyProfileController', (group) => {
    const {
        createSocketConnection,
        createAuthenticatedUserAndGetSocket,
        initSocketConnection,
        disconnectEveryRemainingSocketConnection,
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
        const userID = datatype.uuid();
        const userNickname = internet.userName();
        const socket = await createAuthenticatedUserAndGetSocket({
            userNickname,
            userID,
        });
        const token = getSocketApiAuthToken(socket);

        await createSocketConnection({
            userID,
            token,
        });
        await createSocketConnection({
            userID,
            token,
        });

        console.log('de novueau', { token });
        const { body: rawBody } = await supertest(BASE_URL)
            .get(
                urlcat(
                    TEST_MY_PROFILE_ROUTES_GROUP_PREFIX,
                    'profile-information',
                ),
            )
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const parsedBody = GetMyProfileInformationResponseBody.parse(rawBody);
        const expectedBody: GetMyProfileInformationResponseBody = {
            devicesCounter: 3,
            followersCounter: 0,
            followingCounter: 0,
            playlistsCounter: 0,
            userID,
            userNickname,
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
});
