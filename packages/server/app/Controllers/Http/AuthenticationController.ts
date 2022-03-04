import {
    SignUpResponseBody,
    UserSummary,
    SignUpRequestBody,
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

const passwordStrengthRegex = new RegExp(
    /^(?=.*[A-Z].*[A-Z])(?=.*[!#$:@+%&'*+/\\=?^_`{|}~-])(?=.*[0-9].*[0-9])(?=.*[a-z].*[a-z].*[a-z]).{8,}$/,
);

export default class AuthenticationController {
    public async signUp({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<SignUpResponseBody> {
        try {
            const { authenticationMode, email, password, userNickname } =
                SignUpRequestBody.parse(request.body());

            const userWithGivenNickname = await User.findBy(
                'nickname',
                userNickname,
            );

            if (userWithGivenNickname) {
                response.status(400);
                return {
                    status: 'UNAVAILABLE_NICKNAME',
                };
            }

            const userWithGivenEmail = await User.findBy('email', email);
            if (userWithGivenEmail) {
                response.status(400);
                return {
                    status: 'UNAVAILABLE_EMAIL',
                };
            }

            const passwordIsStrong = passwordStrengthRegex.test(password);
            const passwordIsNotStrong = !passwordIsStrong;
            if (passwordIsNotStrong) {
                response.status(400);
                return {
                    status: 'WEAK_PASSWORD',
                };
            }

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
        } catch (e) {
            console.log(e);

            // if zod fails here we consider it as bad email edge case
            // as the authenticationMode should not be settable by the user
            response.status(400);
            return {
                status: 'INVALID_EMAIL',
            };
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
