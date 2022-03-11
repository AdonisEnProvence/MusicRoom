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
    SignInFailureResponseBody,
} from '@musicroom/types';
import { request, SHOULD_USE_TOKEN_AUTH } from './http';

interface SendSignInArgs {
    email: string;
    password: string;
}

export function sendSignIn({
    email,
    password,
}: SendSignInArgs): Promise<SignInResponseBody> {
    if (SHOULD_USE_TOKEN_AUTH) {
        return sendSignInApi({ email, password });
    }
    return sendSignInWeb({ email, password });
}

async function sendSignInWeb({
    email,
    password,
}: SendSignInArgs): Promise<SignInResponseBody> {
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'web',
    };

    const response = await request.post('/authentication/sign-in', body, {
        validateStatus: (status) => status >= 200 && status <= 499,
    });
    const responseBody = response.data;
    if (SignInFailureResponseBody.check(responseBody)) {
        return responseBody;
    }

    const parsedResponse =
        SignInSuccessfulWebAuthResponseBody.parse(responseBody);

    return parsedResponse;
}

async function sendSignInApi({
    email,
    password,
}: SendSignInArgs): Promise<SignInResponseBody> {
    const body: SignInRequestBody = {
        email,
        password,
        authenticationMode: 'api',
    };

    const response = await request.post('/authentication/sign-in', body, {
        validateStatus: (status) => status >= 200 && status <= 499,
    });
    const responseBody = response.data;
    if (SignInFailureResponseBody.check(responseBody)) {
        return responseBody;
    }

    const parsedResponse =
        SignInSuccessfulApiTokensResponseBody.parse(responseBody);

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

    const apiTokenSuccessSignUpReponseBody =
        ApiTokensSuccessfullSignUpResponseBody.parse(parsedResponseBody);

    await request.persistToken(apiTokenSuccessSignUpReponseBody.token);

    return apiTokenSuccessSignUpReponseBody;
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
    if (SHOULD_USE_TOKEN_AUTH) {
        return await sendApiTokenSignUp(args);
    }

    return await sendWebAuthSignUp(args);
}
