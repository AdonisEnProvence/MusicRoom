import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import {
    AuthenticationModeValues,
    GoogleAuthenticationFailureReasons,
    TokenTypeName,
} from '@musicroom/types';
import Token from 'App/Models/Token';
import TokenType from 'App/Models/TokenType';
import User from 'App/Models/User';
import EmailVerification from 'App/Mailers/EmailVerification';
import PasswordReset from 'App/Mailers/PasswordReset';
import got from 'got/dist/source';
import * as z from 'zod';
import { AuthContract } from '@ioc:Adonis/Addons/Auth';

//inspired by see https://github.com/adonisjs/ally/blob/0c7efd3dfef377b4c2170afc40a2d2280609acb0/src/Drivers/Google/index.ts#L165
const RequiredGoogleUserInfo = z.object({
    sub: z.string().nonempty(),
    name: z.string().nonempty(),
    email: z.string().nonempty().email(),
});
type RequiredGoogleUserInfo = z.infer<typeof RequiredGoogleUserInfo>;

const GOOGLE_USER_INFO_ENDPOINT =
    'https://www.googleapis.com/oauth2/v3/userinfo';

interface VerifyUserGoogleInformationAvailabilityArgs {
    email: string;
    userNickname: string;
    googleID: string;
}

export class AuthenticationService {
    public static async sendEmailForEmailConfirmation({
        user,
    }: {
        user: User;
    }): Promise<void> {
        const emailConfirmationTokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const confirmationTokenValue = await Token.generateCode();
        const confirmationTokenExpiresAt = DateTime.now().plus({
            minutes: 15,
        });

        await user.related('tokens').create({
            uuid: randomUUID(),
            tokenTypeUuid: emailConfirmationTokenType.uuid,
            value: confirmationTokenValue,
            expiresAt: confirmationTokenExpiresAt,
        });

        const emailVerification = new EmailVerification(
            user,
            confirmationTokenValue,
        );
        await emailVerification.sendLater().catch((e) => console.error(e));
    }

    public static async sendPasswordResetEmail({
        user,
    }: {
        user: User;
    }): Promise<void> {
        const passwordResetTokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.PASSWORD_RESET,
        );
        const passwordResetTokenValue = await Token.generateCode();
        const passwordResetTokenExpiresAt = DateTime.now().plus({
            minutes: 15,
        });

        await user.related('tokens').create({
            uuid: randomUUID(),
            tokenTypeUuid: passwordResetTokenType.uuid,
            value: passwordResetTokenValue,
            expiresAt: passwordResetTokenExpiresAt,
        });

        const passwordResetEmail = new PasswordReset(
            user,
            passwordResetTokenValue,
        );
        passwordResetEmail.sendLater().catch(console.error);
    }

    public static async getUserGoogleInformationFromUserGoogleAccessToken(
        userGoogleAccessToken: string,
    ): Promise<RequiredGoogleUserInfo> {
        const response: any = await got
            .get(GOOGLE_USER_INFO_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${userGoogleAccessToken}`,
                    Accept: 'application/json',
                },
            })
            .json();

        return RequiredGoogleUserInfo.parse(response);
    }

    public static async signInUserWithAuthenticationMode({
        user,
        authenticationMode,
        auth,
    }: {
        user: User;
        authenticationMode: AuthenticationModeValues;
        auth: AuthContract;
    }): Promise<
        | {
              status: 'SUCCESS';
          }
        | {
              status: 'SUCCESS';
              token: string;
          }
    > {
        switch (authenticationMode) {
            case 'api': {
                const { token } = await auth.use('api').login(user);
                return {
                    status: 'SUCCESS',
                    token,
                };
            }
            case 'web': {
                await auth.use('web').login(user);
                return {
                    status: 'SUCCESS',
                };
            }
            default: {
                throw new Error(
                    'unkown authentication mode encountered inside signInUserWithAuthenticationMode',
                );
            }
        }
    }

    public static async verifyUserGoogleInformationAvailability({
        googleID,
        email,
        userNickname,
    }: VerifyUserGoogleInformationAvailabilityArgs): Promise<
        GoogleAuthenticationFailureReasons[]
    > {
        const trimmedUserNickname = userNickname.trim();
        const trimmedEmail = email.trim();
        const errors: GoogleAuthenticationFailureReasons[] = [];

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

        const existingUserWithMatchingGoogleID = await User.findBy(
            'google_id',
            googleID,
        );
        if (existingUserWithMatchingGoogleID) {
            errors.push('UNAVAILABLE_GOOGLE_ID');
        }

        console.log(errors);
        return errors;
    }
}
