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
    ResendConfirmationEmailResponseBody,
    RequestPasswordResetResponseBody,
    RequestPasswordResetRequestBody,
    ValidatePasswordResetTokenResponseBody,
    ValidatePasswordResetTokenRequestBody,
    AuthenticateWithGoogleOauthResponseBody,
    AuthenticateWithGoogleOauthRequestBody,
    ResetPasswordRequestBody,
} from '@musicroom/types';
import { DateTime } from 'luxon';
import User from 'App/Models/User';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import invariant from 'tiny-invariant';
import { AuthenticationService } from 'App/Services/AuthenticationService';
import { ResetPasswordResponseBody } from '@musicroom/types/src/authentication';

export default class AuthenticationController {
    /**
     * @signUp
     * @description Will attempt to sign up using given mail & password & userName credentials. On fail will return a failure reasons array.
     * @requestBody
     */
    public async signUp({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<SignUpResponseBody> {
        const { authenticationMode, email, password, userNickname } =
            SignUpRequestBody.parse(request.body());
        const trimmedUserNickname = userNickname.trim();
        const trimmedEmail = email.trim();
        const errors: SignUpFailureReasons[] = [];

        const emailIsInvalid = !z
            .string()
            .email()
            .max(255)
            .safeParse(trimmedEmail).success;
        if (emailIsInvalid) {
            errors.push('INVALID_EMAIL');
        }

        const nickanmeIsInvalid = !z
            .string()
            .min(1)
            .safeParse(trimmedUserNickname).success;
        if (nickanmeIsInvalid) {
            errors.push('INVALID_NICKNAME');
        }

        const userWithGivenNickname = await User.findBy(
            'nickname',
            trimmedUserNickname,
        );
        if (userWithGivenNickname) {
            errors.push('UNAVAILABLE_NICKNAME');
        }

        const userWithGivenEmail = await User.findBy('email', trimmedEmail);
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
            nickname: trimmedUserNickname,
            email: trimmedEmail,
            password,
        });

        await AuthenticationService.sendEmailForEmailConfirmation({
            user: createdUser,
        });

        const { nickname, uuid: userID } = createdUser;
        const userSummary: UserSummary = {
            nickname,
            userID,
        };

        switch (authenticationMode) {
            case 'api': {
                const { token } = await auth
                    .use('api')
                    .attempt(trimmedEmail, password);

                return {
                    token,
                    userSummary,
                    status: 'SUCCESS',
                };
            }
            case 'web': {
                await auth.use('web').attempt(trimmedEmail, password);

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

    /**
     * @signIn
     * @description Will attempt to sign in using given mail & password.
     * @requestBody
     */
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

    /**
     * @signOut
     * @description Authenticated route that sign out authenticated user.
     * @requestBody
     */
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

    /**
     * @confirmEmail
     * @description Authenticated route that will attempt to confirm authenticated user email using given code.
     * @requestBody
     */
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

    /**
     * @resendConfirmationEmail
     * @description Authenticated route that will attempt to resend authenticated user email confirmation code. Could fail depending on rate limit.
     * @requestBody
     */
    public async resendConfirmationEmail({
        auth,
        bouncer,
        response,
    }: HttpContextContract): Promise<ResendConfirmationEmailResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to get her profile information',
        );

        const hasReachedRateLimit = await bouncer.denies(
            'resendConfirmationEmail',
        );
        if (hasReachedRateLimit === true) {
            response.status(429);

            return {
                status: 'REACHED_RATE_LIMIT',
            };
        }

        await AuthenticationService.sendEmailForEmailConfirmation({
            user,
        });

        return {
            status: 'SUCCESS',
        };
    }

    /**
     * @requestPasswordReset
     * @description Authenticated route that will attempt to request authenticated user password reset code. Could fail depending on rate limit.
     * @requestBody
     */
    public async requestPasswordReset({
        request,
        response,
        bouncer,
    }: HttpContextContract): Promise<RequestPasswordResetResponseBody> {
        const { email } = RequestPasswordResetRequestBody.parse(request.body());

        const userWithGivenEmail = await User.findBy('email', email);
        if (userWithGivenEmail === null) {
            response.status(404);

            return {
                status: 'INVALID_EMAIL',
            };
        }

        const hasReachedRateLimit = await bouncer
            .forUser(userWithGivenEmail)
            .denies('requestPasswordReset');
        if (hasReachedRateLimit === true) {
            response.status(429);

            return {
                status: 'REACHED_RATE_LIMIT',
            };
        }

        await AuthenticationService.sendPasswordResetEmail({
            user: userWithGivenEmail,
        });

        return {
            status: 'SUCCESS',
        };
    }

    /**
     * @validatePasswordResetToken
     * @description Authenticated route that will attempt to verify given reset password code for authenticated user.
     * @requestBody
     */
    public async validatePasswordResetToken({
        request,
        response,
    }: HttpContextContract): Promise<ValidatePasswordResetTokenResponseBody> {
        const { token, email } = ValidatePasswordResetTokenRequestBody.parse(
            request.body(),
        );

        const user = await User.findBy('email', email);
        if (user === null) {
            response.status(400);

            return {
                status: 'INVALID_TOKEN',
            };
        }

        const isValidToken = await user.checkToken({
            token,
            tokenType: 'PASSWORD_RESET',
        });
        const isInvalidToken = isValidToken === false;
        if (isInvalidToken === true) {
            response.status(400);

            return {
                status: 'INVALID_TOKEN',
            };
        }

        return {
            status: 'SUCCESS',
        };
    }

    /**
     * @resetPassword
     * @description Authenticated route that will attempt to reset authenticated user password using given reset password code.
     * @requestBody
     */
    public async resetPassword({
        request,
        auth,
        response,
    }: HttpContextContract): Promise<ResetPasswordResponseBody> {
        const { email, password, token, authenticationMode } =
            ResetPasswordRequestBody.parse(request.body());

        const user = await User.findBy('email', email);
        if (user === null) {
            response.status(400);

            return {
                status: 'INVALID_TOKEN',
            };
        }

        const activeToken = await user.getToken({
            token,
            tokenType: 'PASSWORD_RESET',
        });
        if (activeToken === undefined) {
            response.status(400);

            return {
                status: 'INVALID_TOKEN',
            };
        }

        if ((await user.isSamePassword(password)) === true) {
            response.status(400);

            return {
                status: 'PASSWORD_ALREADY_USED',
            };
        }

        user.password = password;
        await user.save();

        await activeToken.revoke();

        return await AuthenticationService.signInUserWithAuthenticationMode({
            auth,
            authenticationMode,
            user,
        });
    }

    /**
     * @authenticateWithGoogleOauth
     * @description Will attempt to sign in or sign up user via user google_id retrieved using given user google access token. On fail will send back a failure reasons array.
     * @requestBody
     */
    public async authenticateWithGoogleOauth({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<AuthenticateWithGoogleOauthResponseBody> {
        const { authenticationMode, userGoogleAccessToken } =
            AuthenticateWithGoogleOauthRequestBody.parse(request.body());
        const userGoogleInformation =
            await AuthenticationService.getUserGoogleInformationFromUserGoogleAccessToken(
                userGoogleAccessToken,
            );
        let existingUserWithMatchingGoogleID = await User.findBy(
            'google_id',
            userGoogleInformation.sub,
        );

        const userDoesnotExist = existingUserWithMatchingGoogleID === null;

        if (userDoesnotExist) {
            //Sign Up
            const googleAuthSignUpFailure =
                await AuthenticationService.verifyUserGoogleInformationAvailability(
                    {
                        email: userGoogleInformation.email,
                        googleID: userGoogleInformation.sub,
                        userNickname: userGoogleInformation.name,
                    },
                );

            if (googleAuthSignUpFailure.length > 0) {
                response.status(400);
                return {
                    status: 'FAILURE',
                    googleAuthSignUpFailure,
                };
            }

            //Reminder there's nothing about email confirmation while authenticating with a google account
            existingUserWithMatchingGoogleID = await User.create({
                nickname: userGoogleInformation.name.trim(),
                email: userGoogleInformation.email.trim(),
                googleID: userGoogleInformation.sub,
            });
        }

        invariant(
            existingUserWithMatchingGoogleID !== null,
            'user matching retrieved googleID is still null should never occurs',
        );

        return await AuthenticationService.signInUserWithAuthenticationMode({
            auth,
            authenticationMode,
            user: existingUserWithMatchingGoogleID,
        });
    }
}
