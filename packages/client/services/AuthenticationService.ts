import {
    ApiTokensSuccessfullSignUpResponseBody,
    SignUpRequestBody,
    SignUpSuccessfullResponseBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

type sendApiTokensSignUpArgs = Omit<SignUpRequestBody, 'authenticationMode'>;

export async function sendApiTokenSignUp({
    email,
    password,
    userNickname,
}: sendApiTokensSignUpArgs): Promise<ApiTokensSuccessfullSignUpResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(url, {
        authenticationMode: 'api',
        email,
        password,
        userNickname,
    } as SignUpRequestBody);
    //readaxios will throw an error how http code 400 catch
    return ApiTokensSuccessfullSignUpResponseBody.parse(rawResponse.data);
}

type sendWebAuthSignUpArgs = Omit<SignUpRequestBody, 'authenticationMode'>;

export async function sendWebAuthSignUp({
    email,
    password,
    userNickname,
}: sendWebAuthSignUpArgs): Promise<SignUpSuccessfullResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(url, {
        authenticationMode: 'web',
        email,
        password,
        userNickname,
    } as SignUpRequestBody);
    //readaxios will throw an error how http code 400 catch
    return WebAuthSuccessfullSignUpResponseBody.parse(rawResponse.data);
}
