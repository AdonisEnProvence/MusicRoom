import { randomUUID } from 'crypto';
import {
    SignUpResponseBody,
    UserSummary,
    SignUpRequestBody,
    SignUpFailureReasons,
    passwordStrengthRegex,
    SignInResponseBody,
    SignInRequestBody,
    SignOutResponseBody,
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    TokenTypeName,
} from '@musicroom/types';
import { DateTime } from 'luxon';
import User from 'App/Models/User';
import Token from 'App/Models/Token';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import invariant from 'tiny-invariant';
import EmailVerification from 'App/Mailers/EmailVerification';
import TokenType from 'App/Models/TokenType';

export default class AuthenticationController {
    public async signUp({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<SignUpResponseBody> {
        const { authenticationMode, email, password, userNickname } =
            SignUpRequestBody.parse(request.body());
        const errors: SignUpFailureReasons[] = [];

        const emailIsInvalid = !z.string().email().max(255).check(email);
        if (emailIsInvalid) {
            errors.push('INVALID_EMAIL');
        }

        const userWithGivenNickname = await User.findBy(
            'nickname',
            userNickname,
        );
        if (userWithGivenNickname) {
            errors.push('UNAVAILABLE_NICKNAME');
        }

        const userWithGivenEmail = await User.findBy('email', email);
        if (userWithGivenEmail) {
            errors.push('UNAVAILABLE_EMAIL');
        }

        const passwordIsStrong = passwordStrengthRegex.test(password);
        const passwordIsNotStrong = !passwordIsStrong;
        if (passwordIsNotStrong) {
            errors.push('WEAK_PASSWORD');
        }

        const signUpFailed = errors.length > 0;
        if (signUpFailed) {
            console.log(errors);

            response.status(400);
            return {
                status: 'FAILURE',
                signUpFailureReasonCollection: errors,
            };
        }

        const createdUser = await User.create({
            nickname: userNickname,
            email: email,
            password,
        });

        const emailConfirmationTokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const confirmationTokenValue = await Token.generateCode();
        const confirmationTokenExpiresAt = DateTime.now().plus({
            minutes: 15,
        });

        await createdUser.related('tokens').create({
            uuid: randomUUID(),
            tokenTypeUuid: emailConfirmationTokenType.uuid,
            value: confirmationTokenValue,
            expiresAt: confirmationTokenExpiresAt,
        });

        const emailVerification = new EmailVerification(
            createdUser,
            confirmationTokenValue,
        );
        await emailVerification.sendLater().catch((e) => console.error(e));

        const { nickname, uuid: userID } = createdUser;
        const userSummary: UserSummary = {
            nickname,
            userID,
        };

        switch (authenticationMode) {
            case 'api': {
                const { token } = await auth
                    .use('api')
                    .attempt(email, password);

                return {
                    token,
                    userSummary,
                    status: 'SUCCESS',
                };
            }
            case 'web': {
                await auth.use('web').attempt(email, password);

                return {
                    userSummary,
                    status: 'SUCCESS',
                };
            }
            default: {
                throw new Error(
                    `unknown authentication mode encountered ${authenticationMode}`,
                );
            }
        }
    }

    public async signIn({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<SignInResponseBody> {
        const { email, password, authenticationMode } = SignInRequestBody.parse(
            request.body(),
        );

        const userWithGivenEmail = await User.findBy('email', email);
        if (userWithGivenEmail === null) {
            response.status(403);

            return {
                status: 'INVALID_CREDENTIALS',
            };
        }

        const userSummary: UserSummary = {
            nickname: userWithGivenEmail.nickname,
            userID: userWithGivenEmail.uuid,
        };

        switch (authenticationMode) {
            case 'web': {
                try {
                    await auth.use('web').attempt(email, password);

                    return {
                        status: 'SUCCESS',
                        userSummary: userSummary,
                    };
                } catch (err: unknown) {
                    response.status(403);

                    return {
                        status: 'INVALID_CREDENTIALS',
                    };
                }
            }

            case 'api': {
                try {
                    const { token } = await auth
                        .use('api')
                        .attempt(email, password);

                    return {
                        status: 'SUCCESS',
                        token,
                        userSummary: userSummary,
                    };
                } catch (err: unknown) {
                    response.status(403);

                    return {
                        status: 'INVALID_CREDENTIALS',
                    };
                }
            }

            default: {
                throw new Error('unkown authentication mode encountered');
            }
        }
    }

    public async signOut({
        request,
        auth,
    }: HttpContextContract): Promise<SignOutResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to get her profile information',
        );

        const apiAuthtoken = request.header('Authorization');
        if (apiAuthtoken) {
            await auth.use('api').revoke();
        } else {
            await auth.logout();
        }

        return {
            status: 'SUCCESS',
        };
    }

    public async confirmEmail({
        request,
        response,
        auth,
        bouncer,
    }: HttpContextContract): Promise<ConfirmEmailResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to get her profile information',
        );

        await bouncer.authorize('confirmEmail');

        const { token } = ConfirmEmailRequestBody.parse(request.body());

        const isValidToken = await user.checkToken({
            token,
            tokenType: 'EMAIL_CONFIRMATION',
        });
        const isInvalidToken = isValidToken === false;
        if (isInvalidToken === true) {
            response.status(400);

            return {
                status: 'INVALID_TOKEN',
            };
        }

        user.confirmedEmailAt = DateTime.now();
        await user.save();

        return {
            status: 'SUCCESS',
        };
    }
}
