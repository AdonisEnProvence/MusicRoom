import Mail, { MessageNode } from '@ioc:Adonis/Addons/Mail';
import Database from '@ioc:Adonis/Lucid/Database';
import {
    ApiTokensSuccessfullSignUpResponseBody,
    GetMyProfileInformationResponseBody,
    SignUpFailureResponseBody,
    SignUpRequestBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import EmailVerification from 'App/Mailers/EmailVerification';
import User from 'App/Models/User';
import { datatype, internet, random } from 'faker';
import test from 'japa';
import { spy } from 'sinon';
import supertest from 'supertest';
import invariant from 'tiny-invariant';
import urlcat from 'urlcat';
import cheerio from 'cheerio';
import {
    BASE_URL,
    generateStrongPassword,
    generateWeakPassword,
    initTestUtils,
    noop,
    TEST_AUTHENTICATION_GROUP_PREFIX,
} from './utils/TestUtils';

test.group('Authentication sign up tests group', (group) => {
    const {
        initSocketConnection,
        waitFor,
        disconnectEveryRemainingSocketConnection,
    } = initTestUtils();

    group.beforeEach(async () => {
        //Init mail.trap here to prevent sending mails to random email if .env is correctly set see test `It should fail to sign up as user with given email is already in base`
        Mail.trap(noop);
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        Mail.restore();
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('It should sign up user with web auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const trimmedEmail = internet.email();
        const trimmedUserNickname = `${internet.userName()} ${internet.userName()}`;
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

        const { body: rawBody } = await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'web',
                email: `           ${trimmedEmail}            `,
                password,
                userNickname: `              ${trimmedUserNickname}        `,
            } as SignUpRequestBody)
            .expect(200);

        const {
            status,
            userSummary: { nickname, userID },
        } = WebAuthSuccessfullSignUpResponseBody.parse(rawBody);
        assert.equal(status, 'SUCCESS');
        assert.isDefined(userID);
        assert.equal(nickname, trimmedUserNickname);

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

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        {
            const message = mailTrapEmailVerificationSpy.lastCall.args[0];

            assert.deepEqual(message.to, [
                {
                    address: trimmedEmail,
                    name: trimmedUserNickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const subject = message.subject;
            invariant(
                subject !== undefined,
                'The subject of the message must be defined',
            );

            const emailVerificationObjectRegex =
                /\[.*].*Welcome.*,.*please.*verify.*your.*email.*!/i;
            assert.match(subject, emailVerificationObjectRegex);
            assert.include(subject, trimmedUserNickname);

            const html = message.html;
            invariant(
                html !== undefined,
                'HTML content of the email must be defined',
            );

            const $ = cheerio.load(html);
            const tokenElement = $('[data-testid="token"]');
            const tokenValue = tokenElement.text();
            assert.match(tokenValue, /\d{6}/);
        }
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

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

        const emailVerification = new EmailVerification(user, 'token1234');
        await emailVerification.send();

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        {
            const message = mailTrapEmailVerificationSpy.lastCall.args[0];

            assert.deepEqual(message.to, [
                {
                    address: email,
                    name: nickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const emailVerificationObjectRegex =
                /\[.*].*Welcome.*,.*please.*verify.*your.*email.*!/i;
            assert.isDefined(message.subject);
            invariant(
                message.subject !== undefined,
                'message subject is undefined',
            );
            assert.match(message.subject, emailVerificationObjectRegex);
            assert.include(message.subject, nickname);
        }
    });

    test('It should sign up user with api token auth using given credentials', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        {
            const message = mailTrapEmailVerificationSpy.lastCall.args[0];

            assert.deepEqual(message.to, [
                {
                    address: email,
                    name: userNickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const emailVerificationObjectRegex =
                /\[.*].*Welcome.*,.*please.*verify.*your.*email.*!/i;
            assert.isDefined(message.subject);
            invariant(
                message.subject !== undefined,
                'message subject is undefined',
            );
            assert.match(message.subject, emailVerificationObjectRegex);
            assert.include(message.subject, nickname);
        }
    });

    test('It should fail to sign up as given password is weak', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateWeakPassword();

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('It should fail to sign up as given name is invalid', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = '                ';
        const password = generateWeakPassword();

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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
        assert.include(signUpFailureReasonCollection, 'INVALID_NICKNAME');
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('It should fail to sign up as given email is invalid', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email().replace('@', random.word());
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('It should fail to sign up as given email is too long', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = `${'email'.repeat(100)}${internet.email()}`;
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('It should send back 500 error as payload is partially empty', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

        await request
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-up'))
            .send({
                authenticationMode: 'api',
                email: undefined,
                password,
                userNickname,
            })
            .expect(500);
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
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

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
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

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);
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
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('It should fail to sign up raising every possibles errors', async (assert) => {
        const email = internet.email().replace('@', random.word());
        const userNickname = '';

        const mailTrapEmailVerificationSpy = spy(noop);
        Mail.trap(mailTrapEmailVerificationSpy);
        // Indeed we're saving a bad formatted email and nickname directly in database
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
        assert.equal(signUpFailureReasonCollection.length, 5);

        assert.deepEqual(signUpFailureReasonCollection, [
            'INVALID_EMAIL',
            'INVALID_NICKNAME',
            'UNAVAILABLE_NICKNAME',
            'UNAVAILABLE_EMAIL',
            'WEAK_PASSWORD',
        ]);
        assert.isTrue(mailTrapEmailVerificationSpy.notCalled);
    });

    test('Users that sign up have their email not confirmed by default', async (assert) => {
        const request = supertest.agent(BASE_URL);
        const email = internet.email();
        const userNickname = internet.userName();
        const password = generateStrongPassword();

        const mailTrapEmailVerificationSpy =
            spy<(message: MessageNode) => void>(noop);
        Mail.trap(mailTrapEmailVerificationSpy);

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

        await waitFor(() => {
            assert.isTrue(mailTrapEmailVerificationSpy.calledOnce);
        });

        {
            const message = mailTrapEmailVerificationSpy.lastCall.args[0];

            assert.deepEqual(message.to, [
                {
                    address: email,
                    name: userNickname,
                },
            ]);

            assert.deepEqual(message.from, {
                address: 'no-reply@adonisenprovence.com',
                name: 'MusicRoom',
            });

            const emailVerificationObjectRegex =
                /\[.*].*Welcome.*,.*please.*verify.*your.*email.*!/i;
            assert.isDefined(message.subject);
            invariant(
                message.subject !== undefined,
                'message subject is undefined',
            );
            assert.match(message.subject, emailVerificationObjectRegex);
            assert.include(message.subject, userNickname);
        }
    });
});
