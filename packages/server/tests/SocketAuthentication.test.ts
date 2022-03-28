import Database from '@ioc:Adonis/Lucid/Database';
import {
    SignInRequestBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
} from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import test from 'japa';
import sinon from 'sinon';
import { io } from 'socket.io-client';
import { DateTime } from 'luxon';
import supertest from 'supertest';
import urlcat from 'urlcat';
import {
    BASE_URL,
    generateStrongPassword,
    initTestUtils,
    TEST_AUTHENTICATION_GROUP_PREFIX,
    TypedTestSocket,
} from './utils/TestUtils';
/**
 * User should create a room, and removes it after user disconnection
 * User should join a room
 * It should create device after user's socket connection, and removes it from base after disconnection
 * It should sent MTV_FORCED_DISCONNECTION to all users in room
 */

test.group('Socket authentication tests group', (group) => {
    const {
        disconnectEveryRemainingSocketConnection,
        disconnectSocket,
        initSocketConnection,
        waitForSocketToBeAcknowledged,
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

    test('Web auth authenticated user should be able to perform socket operation', async (assert) => {
        const request = supertest.agent(BASE_URL);

        const userUnhashedPassword = "Popol l'est gentil";
        const user = await User.create({
            nickname: 'Popol',
            email: 'gentil-popol@gmail.com',
            password: userUnhashedPassword,
            confirmedEmailAt: DateTime.now(),
        });

        const signInRequestBody: SignInRequestBody = {
            email: user.email,
            password: userUnhashedPassword,
            authenticationMode: 'web',
        };
        const signInResponse = await request
            .post('/authentication/sign-in')
            .send(signInRequestBody)
            .expect(200);
        const parsedSignInResponse = SignInSuccessfulWebAuthResponseBody.parse(
            signInResponse.body,
        );
        assert.deepStrictEqual<SignInSuccessfulWebAuthResponseBody>(
            parsedSignInResponse,
            {
                status: 'SUCCESS',
                userSummary: {
                    nickname: user.nickname,
                    userID: user.uuid,
                },
            },
        );

        /**
         * ResponseSetCookies example
         * {
                responseSetCookies: [
                    'remember_web=eyJtZXNzYWdlIjoiIn0; Max-Age=-1; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
                    'adonis-session=s%3AeyJtZXNzYWdlIjoiY2wwcXFoc3liMDAwMmpjcG84Y2pnZTgzdSIsInB1cnBvc2UiOiJhZG9uaXMtc2Vzc2lvbiJ9.YpAOIM_0iHXoFKjjpNyF-SLvfOWw1NuPzSt5q2V3T7E; Max-Age=7200; Path=/; HttpOnly',
                    'cl0qqhsyb0002jcpo8cjge83u=e%3AyFGWy7ps6TI9kMLsR9ophsQf7reC-CH-tX9Ysjk3hOZkKtNdwLdxzIGn0KFK2KxH-qij1ApKpBpEuUvcGzTvy7vmPScRt06ynRKjKKhlUfmOBg1EtSTy-G0pF3BDe9kzM0yeKf-uXpJt528h1X4IDw.V09jeVo4eVRMMGg1eWl2Mw.Pabq1W6Vo0h21rhurMDnxHCdkTwJpGO3_dcBv6k2kHk; Max-Age=7200; Path=/; HttpOnly'
                ]
            }
         */
        const rawResponseSetCookies: string[] =
            signInResponse.header['set-cookie'];
        const cookies = rawResponseSetCookies
            .map((cookie) => cookie.split(';')[0])
            .join(';');
        console.log({ cookies });

        const socket: TypedTestSocket = io(BASE_URL, {
            extraHeaders: {
                Cookie: cookies,
            },
            withCredentials: true,
        });

        await waitForSocketToBeAcknowledged(socket);
        await disconnectSocket(socket);
    });

    test('Api token authenticated user should be able to perform socket operation', async (assert) => {
        const userID = datatype.uuid();
        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
            email,
            password,
            confirmedEmailAt: DateTime.now(),
        });

        //Perform sign in
        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-in'))
            .send({
                authenticationMode: 'api',
                email,
                password,
            } as SignInRequestBody)
            .expect(200);
        const { token } = SignInSuccessfulApiTokensResponseBody.parse(rawBody);

        const socket = io(BASE_URL, {
            withCredentials: true,
            auth: {
                Authorization: `Bearer ${token}`,
            },
        });

        await waitForSocketToBeAcknowledged(socket);
        assert.isTrue(socket.connected);
        await disconnectSocket(socket);
    });

    test('Unauthenticated user should not be able to perform socket operation', async (assert) => {
        const userID = datatype.uuid();
        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
            email,
            password,
            confirmedEmailAt: DateTime.now(),
        });

        const socket = io(BASE_URL, {
            withCredentials: true,
        });

        assert.plan(1);
        try {
            await waitForSocketToBeAcknowledged(socket);
        } catch (e) {
            assert.isFalse(socket.connected);
        }
    });

    test('Providing Invalid token user should not be able to perform socket operation', async (assert) => {
        const userID = datatype.uuid();
        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
            email,
            password,
            confirmedEmailAt: DateTime.now(),
        });

        const socket = io(BASE_URL, {
            withCredentials: true,
            auth: {
                Authorization: `Bearer ${datatype.uuid()}`,
            },
        });

        assert.plan(1);
        try {
            await waitForSocketToBeAcknowledged(socket);
        } catch (e) {
            assert.isFalse(socket.connected);
        }
    });

    test('User that has not confirmed her email can not create socket connection', async (assert) => {
        const userID = datatype.uuid();
        const email = internet.email();
        const password = generateStrongPassword();
        await User.create({
            uuid: userID,
            nickname: internet.userName(),
            email,
            password,

            // User has not confirmed her email
            confirmedEmailAt: null,
        });

        const { body: rawBody } = await supertest(BASE_URL)
            .post(urlcat(TEST_AUTHENTICATION_GROUP_PREFIX, 'sign-in'))
            .send({
                authenticationMode: 'api',
                email,
                password,
            } as SignInRequestBody)
            .expect(200);
        const { token } = SignInSuccessfulApiTokensResponseBody.parse(rawBody);

        const socket = io(BASE_URL, {
            withCredentials: true,
            auth: {
                Authorization: `Bearer ${token}`,
            },
        });

        assert.plan(1);
        try {
            await waitForSocketToBeAcknowledged(socket);
        } catch {
            assert.isFalse(socket.connected);
        }
    });
});
