import { SignUpResponseBody } from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import { OpaqueTokenContract } from '@ioc:Adonis/Addons/Auth';

export const SignInRequestBody = z.object({
    email: z.string().email(),
    password: z.string(),
    authenticationMode: z.enum(['web-auth', 'api-tokens']),
});
export type SignInRequestBody = z.infer<typeof SignInRequestBody>;

export default class AuthenticationController {
    public async signUp(): Promise<SignUpResponseBody> {
        const userID = datatype.uuid();
        const userNickname = internet.userName();

        await User.create({
            uuid: userID,
            nickname: userNickname,
        });

        return {
            userID,
            userNickname,
        };
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
