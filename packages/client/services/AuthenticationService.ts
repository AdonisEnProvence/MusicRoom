import {
    ApiTokensSuccessfullSignUpResponseBody,
    SignUpFailureReasons,
    SignUpRequestBody,
    SignUpResponseBody,
    SignUpSuccessfullResponseBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import { Platform } from 'react-native';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function getMe(): Promise<{ uuid: string; nickname: string }> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/me');

    const rawResponse = await redaxios.get(url, {
        withCredentials: true,
    });

    return rawResponse.data;
}

interface SendSignInArgs {
    email: string;
    password: string;
}

export async function sendSignIn({
    email,
    password,
}: SendSignInArgs): Promise<void> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-in');

    await redaxios.post(
        url,
        {
            email,
            password,
            authenticationMode: 'web-auth',
        },
        {
            withCredentials: true,
        },
    );
}

export class SignUpError extends Error {
    public signUpFailReason: SignUpFailureReasons;

    constructor(signUpFailReason: SignUpFailureReasons) {
        super();

        this.signUpFailReason = signUpFailReason;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SignUpError.prototype);
    }
}

type sendApiTokensSignUpArgs = Omit<SignUpRequestBody, 'authenticationMode'>;

export async function sendApiTokenSignUp({
    email,
    password,
    userNickname,
}: sendApiTokensSignUpArgs): Promise<ApiTokensSuccessfullSignUpResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(
        url,
        {
            authenticationMode: 'api',
            email,
            password,
            userNickname,
        } as SignUpRequestBody,
        {
            validateStatus: () => false,
        },
    );
    const parsedResponseBody = SignUpResponseBody.parse(rawResponse.data);

    const signUpFailed = parsedResponseBody.status !== 'SUCCESS';
    if (signUpFailed) {
        throw new SignUpError(parsedResponseBody.status);
    }

    //useless parse below for type only
    return ApiTokensSuccessfullSignUpResponseBody.parse(parsedResponseBody);
}

type sendWebAuthSignUpArgs = Omit<SignUpRequestBody, 'authenticationMode'>;

export async function sendWebAuthSignUp({
    email,
    password,
    userNickname,
}: sendWebAuthSignUpArgs): Promise<WebAuthSuccessfullSignUpResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(
        url,
        {
            authenticationMode: 'web',
            email,
            password,
            userNickname,
        } as SignUpRequestBody,
        {
            validateStatus: () => false,
        },
    );
    const parsedResponseBody = SignUpResponseBody.parse(rawResponse.data);

    const signUpFailed = parsedResponseBody.status !== 'SUCCESS';
    if (signUpFailed) {
        throw new SignUpError(parsedResponseBody.status);
    }

    //useless parse below for type only
    return WebAuthSuccessfullSignUpResponseBody.parse(parsedResponseBody);
}

export async function sendSignUp(
    body: SignUpRequestBody,
): Promise<SignUpResponseBody> {
    const isWebBrowser = Platform.OS === 'web';

    if (isWebBrowser) {
        return await sendWebAuthSignUp(body);
    }

    return await sendApiTokenSignUp(body);
    //TODO handle token
}
