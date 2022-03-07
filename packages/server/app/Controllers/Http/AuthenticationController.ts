import {
    SignUpResponseBody,
    UserSummary,
    SignUpRequestBody,
    SignUpFailureReasons,
} from '@musicroom/types';
import User from 'App/Models/User';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import { OpaqueTokenContract } from '@ioc:Adonis/Addons/Auth';

export const SignInRequestBody = z.object({
    email: z.string().email(),
    password: z.string(),
    authenticationMode: z.enum(['web-auth', 'api-tokens']),
});
export type SignInRequestBody = z.infer<typeof SignInRequestBody>;

// Inspired by https://stackoverflow.com/questions/5142103/regex-to-validate-password-strength
// Password has to have 2 caps letter one special char 2 digits and 3 lowercase char and minimal length has to be 8
// Valid password examples: ':net66LTW', 'RN4k`d8he9k.'
// Invalid password examples: 'bestpasswor@1', 'abcqwerty', 'ABCWE'

const passwordStrengthRegex = new RegExp(
    /^(?=.*[A-Z].*[A-Z])(?=.*[!#$:@+%&'*+/\\=?^_`{|}~-])(?=.*[0-9].*[0-9])(?=.*[a-z].*[a-z].*[a-z]).{8,}$/,
);

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
        console.log('COULD NOT FIND ANY ERRORS');

        const { nickname, uuid: userID } = await User.create({
            nickname: userNickname,
            email: email,
            password,
        });

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
        auth,
    }: HttpContextContract): Promise<void | {
        token: OpaqueTokenContract<User>;
    }> {
        const { email, password, authenticationMode } = SignInRequestBody.parse(
            request.body(),
        );

        switch (authenticationMode) {
            case 'web-auth': {
                await auth.use('web').attempt(email, password);

                return;
            }

            case 'api-tokens': {
                const token = await auth.use('api').attempt(email, password);

                return {
                    token,
                };
            }

            default: {
                throw new Error('unkown authentication mode encountered');
            }
        }
    }

    public async me({ auth }: HttpContextContract): Promise<any> {
        return {
            user: auth.user,
        };
    }
}
