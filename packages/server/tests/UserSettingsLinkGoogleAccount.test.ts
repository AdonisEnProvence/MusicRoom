import Database from '@ioc:Adonis/Lucid/Database';
import {
    LinkGoogleAccountFailureResponseBody,
    LinkGoogleAccountRequestBody,
    LinkGoogleAccountSuccessResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { AuthenticationService } from 'App/Services/AuthenticationService';
import { internet, random } from 'faker';
import test from 'japa';
import Sinon from 'sinon';
import sinon from 'sinon';
import supertest from 'supertest';
import { BASE_URL, initTestUtils } from './utils/TestUtils';

test.group('User settings link google account group tests', (group) => {
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

    test('It should fail to link a google account as user is not authenticated', async () => {
        await supertest(BASE_URL)
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken: random.word(),
            } as LinkGoogleAccountRequestBody)
            .expect(401);
    });

    test('It should fail to link a google account as user doesnot have verified her email', async () => {
        const request = createRequest();

        const emailIsNotConfirmed = true;
        await createUserAndAuthenticate(request, emailIsNotConfirmed);

        await request
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken: random.word(),
            } as LinkGoogleAccountRequestBody)
            .expect(403);
    });

    test('It should fail to link a google account as user already has a linked google account', async () => {
        const request = createRequest();

        const emailIsNotConfirmed = true;
        const user = await createUserAndAuthenticate(
            request,
            emailIsNotConfirmed,
        );
        user.googleID = random.word();
        await user.save();

        await request
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken: random.word(),
            } as LinkGoogleAccountRequestBody)
            .expect(403);
    });

    test('It should fail to link a google account as body is missing', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        await request.post('/me/link-google-account').expect(500);
    });

    test('It should fail to link a google account as body is invalid', async () => {
        const request = createRequest();

        await createUserAndAuthenticate(request);

        await request
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken: '',
            } as LinkGoogleAccountRequestBody)
            .expect(500);
    });

    test('It should fail to link a google account as user with retrieved googleID is already in base', async (assert) => {
        const request = createRequest();

        const userGoogleAccessToken = random.word();
        const googleID = random.word();
        await User.create({
            googleID,
            nickname: internet.userName(),
            email: internet.email(),
        });

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);
            return {
                email: internet.email(),
                name: internet.userName(),
                sub: googleID,
            };
        });

        const user = await createUserAndAuthenticate(request);
        const response = await request
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken,
            } as LinkGoogleAccountRequestBody)
            .expect(400);

        const parsedBody = LinkGoogleAccountFailureResponseBody.parse(
            response.body,
        );
        assert.equal(parsedBody.status, 'FAILURE');
        assert.deepEqual(parsedBody.linkGoogleAccountFailureReasons, [
            'UNAVAILABLE_GOOGLE_ID',
        ]);
        await user.refresh();
        assert.isNull(user.googleID);
    });

    test('It should link a google account to user musicroom account', async (assert) => {
        const request = createRequest();

        const userGoogleAccessToken = random.word();
        const googleID = random.word();
        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);
            return {
                email: internet.email(),
                name: internet.userName(),
                sub: googleID,
            };
        });

        const user = await createUserAndAuthenticate(request);
        const saveUserEmail = user.email;
        const saveUserNickname = user.nickname;

        const response = await request
            .post('/me/link-google-account')
            .send({
                userGoogleAccessToken,
            } as LinkGoogleAccountRequestBody)
            .expect(200);

        const parsedBody = LinkGoogleAccountSuccessResponseBody.parse(
            response.body,
        );
        assert.equal(parsedBody.status, 'SUCCESS');

        await user.refresh();
        assert.equal(user.googleID, googleID);
        assert.equal(user.email, saveUserEmail);
        assert.equal(user.nickname, saveUserNickname);
    });
});
