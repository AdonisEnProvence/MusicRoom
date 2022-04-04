import Database from '@ioc:Adonis/Lucid/Database';
import { datatype, internet, random } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import Sinon from 'sinon';
import Mail from '@ioc:Adonis/Addons/Mail';
import { AuthenticationService } from 'App/Services/AuthenticationService';
import {
    ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody,
    AuthenticateWithGoogleOauthFailureReponseBody,
    AuthenticateWithGoogleOauthRequestBody,
    GetMyProfileInformationResponseBody,
    WebAuthAuthenticateWithGoogleOauthSuccessResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { BASE_URL, initTestUtils, noop } from '../../../tests/utils/TestUtils';

test.group('Google Authentication Sign In and Sign Up tests group', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        Mail.trap(noop);
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('It should sign up using web auth google oauth', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const userGoogleAccessToken = datatype.uuid();
        const userGoogleID = datatype.uuid();

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);
            return {
                email: internet.email(),
                name: internet.userName(),
                sub: userGoogleID,
            };
        });

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'web',
            userGoogleAccessToken,
        };
        const googleAuthenticationResponse = await request
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(200);

        const parsedGoogleAuthenticationBody =
            WebAuthAuthenticateWithGoogleOauthSuccessResponseBody.parse(
                googleAuthenticationResponse.body,
            );
        assert.equal(parsedGoogleAuthenticationBody.status, 'SUCCESS');
        const responseSetCookies =
            googleAuthenticationResponse.header['set-cookie'];
        assert.isDefined(responseSetCookies);
        assert.isTrue(responseSetCookies.length > 0);

        const createdUser = await User.findByOrFail('google_id', userGoogleID);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, createdUser.nickname);
        assert.equal(getMyProfileParsedBody.userID, createdUser.uuid);
    });

    test('It should sign up using api token google oauth', async (assert) => {
        const userGoogleAccessToken = datatype.uuid();
        const userGoogleID = datatype.uuid();

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);
            return {
                email: internet.email(),
                name: internet.userName(),
                sub: userGoogleID,
            };
        });

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'api',
            userGoogleAccessToken,
        };
        const googleAuthenticationResponse = await supertest(BASE_URL)
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(200);

        const parsedGoogleAuthenticationBody =
            ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody.parse(
                googleAuthenticationResponse.body,
            );
        assert.equal(parsedGoogleAuthenticationBody.status, 'SUCCESS');
        assert.isDefined(parsedGoogleAuthenticationBody.token);

        const createdUser = await User.findByOrFail('google_id', userGoogleID);

        const getMyProfileRawResponse = await supertest(BASE_URL)
            .get('/me/profile-information')
            .set(
                'Authorization',
                `bearer ${parsedGoogleAuthenticationBody.token}`,
            )
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, createdUser.nickname);
        assert.equal(getMyProfileParsedBody.userID, createdUser.uuid);
    });

    test('It should sign in using web auth google oauth', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const userGoogleAccessToken = datatype.uuid();
        const email = internet.email();
        const nickname = internet.userName();
        const googleID = datatype.uuid();

        await User.create({
            email,
            nickname,
            googleID,
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

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'web',
            userGoogleAccessToken,
        };
        const googleAuthenticationResponse = await request
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(200);

        const parsedGoogleAuthenticationBody =
            WebAuthAuthenticateWithGoogleOauthSuccessResponseBody.parse(
                googleAuthenticationResponse.body,
            );
        assert.equal(parsedGoogleAuthenticationBody.status, 'SUCCESS');
        const responseSetCookies =
            googleAuthenticationResponse.header['set-cookie'];
        assert.isDefined(responseSetCookies);
        assert.isTrue(responseSetCookies.length > 0);
        const allUsers = await User.all();
        assert.equal(allUsers.length, 1);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, nickname);
    });

    test('It should sign up using api token google oauth', async (assert) => {
        const userGoogleAccessToken = datatype.uuid();
        const email = internet.email();
        const nickname = internet.userName();
        const googleID = datatype.uuid();

        await User.create({
            email,
            nickname,
            googleID,
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

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'api',
            userGoogleAccessToken,
        };
        const googleAuthenticationResponse = await supertest(BASE_URL)
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(200);

        const parsedGoogleAuthenticationBody =
            ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody.parse(
                googleAuthenticationResponse.body,
            );
        assert.equal(parsedGoogleAuthenticationBody.status, 'SUCCESS');
        assert.isDefined(parsedGoogleAuthenticationBody.token);

        const allUsers = await User.all();
        assert.equal(allUsers.length, 1);

        const getMyProfileRawResponse = await supertest(BASE_URL)
            .get('/me/profile-information')
            .set(
                'Authorization',
                `bearer ${parsedGoogleAuthenticationBody.token}`,
            )
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, nickname);
    });

    test('It should fail to sign up using google oauth as user with same extracted google credentials already exists', async (assert) => {
        const userGoogleAccessToken = datatype.uuid();
        const email = internet.email();
        const userNickname = internet.userName();

        await User.create({
            email,
            nickname: userNickname,
            googleID: datatype.uuid(),
        });

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);

            return {
                email,
                name: userNickname,
                sub: datatype.uuid(),
            };
        });

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'api',
            userGoogleAccessToken,
        };
        const rawResponse = await supertest(BASE_URL)
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(400);

        const googleAuthenticationErrorResponse =
            AuthenticateWithGoogleOauthFailureReponseBody.parse(
                rawResponse.body,
            );
        assert.equal(googleAuthenticationErrorResponse.status, 'FAILURE');
        assert.deepEqual(
            googleAuthenticationErrorResponse.googleAuthSignUpFailure,
            ['UNAVAILABLE_NICKNAME', 'UNAVAILABLE_EMAIL'],
        );

        const allUsers = await User.all();
        assert.equal(allUsers.length, 1);
    });

    test('It should fail to sign up using google oauth as extracted google credentials are invalid toward our conventions', async (assert) => {
        const userGoogleAccessToken = datatype.uuid();
        const email = internet.email().replace('@', random.word());
        const userNickname = '';

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async (receivedUserGoogleAccessToken) => {
            assert.equal(receivedUserGoogleAccessToken, userGoogleAccessToken);

            return {
                email,
                name: userNickname,
                sub: datatype.uuid(),
            };
        });

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'api',
            userGoogleAccessToken,
        };
        const rawResponse = await supertest(BASE_URL)
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(400);

        const googleAuthenticationErrorResponse =
            AuthenticateWithGoogleOauthFailureReponseBody.parse(
                rawResponse.body,
            );
        assert.equal(googleAuthenticationErrorResponse.status, 'FAILURE');
        assert.deepEqual(
            googleAuthenticationErrorResponse.googleAuthSignUpFailure,
            ['INVALID_EMAIL', 'INVALID_NICKNAME'],
        );

        const allUsers = await User.all();
        assert.equal(allUsers.length, 0);
    });

    //Should this be handled differently ?
    test('It should fail to sign up using google oauth as google sends back an error', async (assert) => {
        const userGoogleAccessToken = datatype.uuid();
        const email = internet.email();
        const userNickname = internet.userName();

        await User.create({
            email,
            nickname: userNickname,
            googleID: datatype.uuid(),
        });

        Sinon.stub(
            AuthenticationService,
            'getUserGoogleInformationFromUserGoogleAccessToken',
        ).callsFake(async () => {
            throw new Error('Google error');
        });

        const googleAuthenticateBody: AuthenticateWithGoogleOauthRequestBody = {
            authenticationMode: 'api',
            userGoogleAccessToken,
        };
        await supertest(BASE_URL)
            .post('/authentication/authenticate-with-google-oauth')
            .send(googleAuthenticateBody)
            .expect(500);

        const allUsers = await User.all();
        assert.equal(allUsers.length, 1);
    });
});
