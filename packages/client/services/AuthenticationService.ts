import {
    ApiTokensSuccessfullSignUpResponseBody,
    SignUpFailureReasons,
    SignInRequestBody,
    SignInResponseBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
    SignUpRequestBody,
    SignUpResponseBody,
    WebAuthSuccessfullSignUpResponseBody,
} from '@musicroom/types';
import { Platform } from 'react-native';
import { request } from './http';

export async function getMe(): Promise<{ uuid: string; nickname: string }> {
    const rawResponse = await request.get('/authentication/me', {
        withCredentials: true,
    });

    return rawResponse.data;
}

interface SendSignInArgs {
    email: string;
    password: string;
}

export function sendSignIn({
    email,
    password,
}: SendSignInArgs): Promise<SignInResponseBody> {
    if (Platform.OS === 'web') {
        return sendSignInWeb({ email, password });
    }

    return sendSignInApi({ email, password });
}

async function sendSignInWeb({
    email,
    password,
}: SendSignInArgs): Promise<SignInSuccessfulWebAuthResponseBody> {
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'web',
    };

    const response = await request.post('/authentication/sign-in', body, {
        withCredentials: true,
    });
    const parsedResponse = SignInSuccessfulWebAuthResponseBody.parse(
        response.data,
    );

    return parsedResponse;
}

async function sendSignInApi({
    email,
    password,
}: SendSignInArgs): Promise<SignInSuccessfulApiTokensResponseBody> {
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'api',
    };

    const response = await request.post('/authentication/sign-in', body);
    const parsedResponse = SignInSuccessfulApiTokensResponseBody.parse(
        response.data,
    );

    await request.persistToken(parsedResponse.token);

    return parsedResponse;
}

export class SignUpError extends Error {
    public signUpFailReasonCollection: SignUpFailureReasons[];

    constructor(signUpFailReasonCollection: SignUpFailureReasons[]) {
        super();

        this.signUpFailReasonCollection = signUpFailReasonCollection;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SignUpError.prototype);
    }
}

type sendSignUpArgs = Omit<SignUpRequestBody, 'authenticationMode'>;

export async function sendApiTokenSignUp({
    email,
    password,
    userNickname,
}: sendSignUpArgs): Promise<ApiTokensSuccessfullSignUpResponseBody> {
    const rawResponse = await request.post(
        '/authentication/sign-up',
        {
            authenticationMode: 'api',
            email,
            password,
            userNickname,
        } as SignUpRequestBody,
        {
            validateStatus: () => true,
        },
    );
    //Error 500 will raise an error indirectly via below zod parsing
    const parsedResponseBody = SignUpResponseBody.parse(rawResponse.data);

    if (parsedResponseBody.status === 'FAILURE') {
        throw new SignUpError(parsedResponseBody.signUpFailureReasonCollection);
    }

    //useless parse below for type only
    return ApiTokensSuccessfullSignUpResponseBody.parse(parsedResponseBody);
}

export async function sendWebAuthSignUp({
    email,
    password,
    userNickname,
}: sendSignUpArgs): Promise<WebAuthSuccessfullSignUpResponseBody> {
    const rawResponse = await request.post(
        '/authentication/sign-up',
        {
            authenticationMode: 'web',
            email,
            password,
            userNickname,
        } as SignUpRequestBody,
        {
            validateStatus: () => true,
        },
    );
    //Error 500 will raise an error indirectly via below zod parsing
    const parsedResponseBody = SignUpResponseBody.parse(rawResponse.data);

    if (parsedResponseBody.status === 'FAILURE') {
        throw new SignUpError(parsedResponseBody.signUpFailureReasonCollection);
    }

    //useless parse below for type only
    return WebAuthSuccessfullSignUpResponseBody.parse(parsedResponseBody);
}

export async function sendSignUp(
    args: sendSignUpArgs,
): Promise<SignUpResponseBody> {
    const isWebBrowser = Platform.OS === 'web';

    if (isWebBrowser) {
        return await sendWebAuthSignUp(args);
    }

    return await sendApiTokenSignUp(args);
    //TODO handle token
}
