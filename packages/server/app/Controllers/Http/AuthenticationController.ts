import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { SignUpRequestBody, SignUpResponseBody } from '@musicroom/types';
import User from 'App/Models/User';
import { datatype } from 'faker';

export default class AuthenticationController {
    public async signUp({
        request,
    }: HttpContextContract): Promise<SignUpResponseBody> {
        const rawBody = request.body();

        const { userNickname } = SignUpRequestBody.parse(rawBody);
        const userID = datatype.uuid();
        await User.create({
            uuid: userID,
            nickname: userNickname,
        });

        return {
            userID,
        };
    }
}
