import { SignUpResponseBody } from '@musicroom/types';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';

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
}
