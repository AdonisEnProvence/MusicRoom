import Database from '@ioc:Adonis/Lucid/Database';
import {
    ApiTokensSuccessfullSignUpResponseBody,
    GetMyProfileInformationResponseBody,
    SignUpFailureResponseBody,
    SignUpRequestBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet, random } from 'faker';
import test from 'japa';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    generateStrongPassword,
    generateWeakPassword,
    initTestUtils,
    TEST_AUTHENTICATION_GROUP_PREFIX,
} from './utils/TestUtils';

test.group('Authentication sign up tests group', (group) => {
    const { initSocketConnection, disconnectEveryRemainingSocketConnection } =
        initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('It should sign up user with web auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const {
            status,
            userSummary: { nickname, userID },
        } = WebAuthSuccessfullSignUpResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isDefined(userID);
        assert.equal(nickname, userNickname);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, nickname);
        assert.equal(getMyProfileParsedBody.userID, userID);
    });

    test('It should send an email verification email', async (assert) => {
        const email = internet.email();
        const nickname = internet.userName();
        const password = generateStrongPassword();

        const user = await User.create({
            email,
            nickname,
            password,
        });

        Mail.trap((message) => {
            assert.deepEqual(message.to, [
                {
                    address: email,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
            });

            assert.equal(
                message.subject,
                `Welcome ${nickname}, please verify your email !`,
            );
        });

        const emailVerification = new EmailVerification(user);
        await emailVerification.send();

        //Mail.trap will be expected without any more required actions such as waitFor
    });

    test.failing(
        'It should fail expecting no email to be sent',
        async (assert) => {
            const email = 'cinem69586@f1xm.com'; //internet.email();
            const nickname = internet.userName();
            const password = generateStrongPassword();

            const user = await User.create({
                email,
                nickname,
                password,
            });

            Mail.trap(() => {
                const onSignUpFailEmailShouldNotBeSent = true;
                assert.isFalse(onSignUpFailEmailShouldNotBeSent);
            });

            const emailVerification = new EmailVerification(user);
            await emailVerification.send();
        },
    );

    test('It should sign up user with api token auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const {
            status,
            token,
            userSummary: { nickname, userID },
        } = ApiTokensSuccessfullSignUpResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isDefined(token);
        assert.isDefined(userID);
        assert.equal(nickname, userNickname);

        const getMyProfileRawResponse = await request
            .get('/me/profile-information')
            .set('Authorization', `bearer ${token}`)
            .expect(200)
            .expect('Content-Type', /json/);
        const getMyProfileParsedBody =
            GetMyProfileInformationResponseBody.parse(
                getMyProfileRawResponse.body,
            );

        assert.equal(getMyProfileParsedBody.userNickname, nickname);
        assert.equal(getMyProfileParsedBody.userID, userID);
    });

    test('It should fail to sign up as given password is weak', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateWeakPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'WEAK_PASSWORD');
    });

    test('It should fail to sign up as given email is invalid', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'INVALID_EMAIL');
    });

    test('It should fail to sign up as given email is too long', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = `${'email'.repeat(100)}${internet.email()}`;
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'INVALID_EMAIL');
    });

    test('It should send back 500 error as payload is partially empty', async () => {
        const request = supertest.agent(BASE_URL);
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email: undefined,
                password,
                userNickname,
            })
            .expect(500);
    });

    test('It should fail to sign up as given username is taken', async (assert) => {
        const userNickname = internet.userName();

        await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email: internet.email(),
                password: generateStrongPassword(),
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const password = generateStrongPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'UNAVAILABLE_NICKNAME');
    });

    test('It should fail to sign up as user with given email is already in base', async (assert) => {
        const email = internet.email();

        await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password: generateStrongPassword(),
                userNickname: internet.userName(),
            } as SignUpRequestBody)
            .expect(200);

        const request = supertest.agent(BASE_URL);
        const password = internet.password();
        const userNickname = internet.userName();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.include(signUpFailureReasonCollection, 'UNAVAILABLE_EMAIL');
    });

    test('It should fail to sign up raising every possibles errors', async (assert) => {
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();

        // Indeed we're saving a bad formatted email directly in database
        // To cover corresponding exception for the following sign up
        await User.create({
            email,
            nickname: userNickname,
            password: 'nevermind',
            uuid: datatype.uuid(),
        });

        const request = supertest.agent(BASE_URL);
        const password = generateWeakPassword();

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(400);

        const { status, signUpFailureReasonCollection } =
            SignUpFailureResponseBody.parse(rawBody);
        assert.equal(status, 'FAILURE');
        assert.isDefined(signUpFailureReasonCollection);
        assert.equal(signUpFailureReasonCollection.length, 4);

        assert.deepEqual(signUpFailureReasonCollection, [
            'INVALID_EMAIL',
            'UNAVAILABLE_NICKNAME',
            'UNAVAILABLE_EMAIL',
            'WEAK_PASSWORD',
        ]);
    });

    test('Users that sign up have their email not confirmed by default', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email,
                password,
                userNickname,
            } as SignUpRequestBody)
            .expect(200);

        const user = await User.findByOrFail('email', email);
        assert.isNull(user.confirmedEmailAt);
    });
});
