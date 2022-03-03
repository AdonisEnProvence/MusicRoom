import { SignUpResponseBody } from '@musicroom/types';
import User from 'App/Models/User';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import { OpaqueTokenContract } from '@ioc:Adonis/Addons/Auth';
import { SignUpRequestBody } from '@musicroom/types/src/authentication';

export const SignInRequestBody = z.object({
    email: z.string().email(),
    password: z.string(),
    authenticationMode: z.enum(['web-auth', 'api-tokens']),
});
export type SignInRequestBody = z.infer<typeof SignInRequestBody>;

export default class AuthenticationController {
    public async signUp({
        request,
        response,
        auth,
    }: HttpContextContract): Promise<SignUpResponseBody> {
        const { authenticationMode, email, password, userNickname } =
            SignUpRequestBody.parse(request.body());

        const userWithGivenNickname = await User.findBy(
            'nickname',
            userNickname,
        );
        console.log({ userWithGivenNickname });
        if (userWithGivenNickname) {
            response.status(400);
            return {
                status: 'SAME_NICKNAME',
            };
        }

        const emailIsValid = true;
        const emailIsInvalid = !emailIsValid;
        if (emailIsInvalid) {
            return {
                status: 'BAD_EMAIL',
            };
        }

        const userWithGivenEmail = await User.findBy('email', email);
        console.log({ userWithGivenEmail });
        if (userWithGivenEmail) {
            response.status(400);
            return {
                status: 'SAME_EMAIL',
            };
        }

        const passwordIsStrong = true;
        const passwordIsNotString = !passwordIsStrong;
        console.log({ passwordIsNotString });
        if (passwordIsNotString) {
            response.status(400);
            return {
                status: 'WEAK_PASSWORD',
            };
        }

        await User.create({
            nickname: userNickname,
            email: email,
            password,
        });

        switch (authenticationMode) {
            case 'api': {
                const { token } = await auth
                    .use('api')
                    .attempt(email, password);

                return {
                    token,
                    status: 'SUCCESS',
                };
            }
            case 'web': {
                await auth.use('web').attempt(email, password);

                return {
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
