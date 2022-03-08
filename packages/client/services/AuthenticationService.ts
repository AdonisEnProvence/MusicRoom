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
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-in');
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'web',
    };

    const response = await redaxios.post(url, body, {
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
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-in');
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'api',
    };

    const response = await redaxios.post(url, body);
    const parsedResponse = SignInSuccessfulApiTokensResponseBody.parse(
        response.data,
    );

    console.log('store token', parsedResponse.token);

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
