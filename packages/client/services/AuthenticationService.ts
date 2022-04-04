import {
    ApiTokensSuccessfullSignUpResponseBody,
    SignUpFailureReasons,
    SignInRequestBody,
    SignInResponseBody,
    SignInSuccessfulApiTokensResponseBody,
    SignInSuccessfulWebAuthResponseBody,
    SignUpRequestBody,
    WebAuthSignUpResponseBody,
    WebAuthSuccessfullSignUpResponseBody,
    SignInFailureResponseBody,
    SignUpSuccessfullResponseBody,
    SignOutResponseBody,
    ConfirmEmailRequestBody,
    ConfirmEmailResponseBody,
    ResendConfirmationEmailResponseBody,
    ApiTokensSignUpResponseBody,
    RequestPasswordResetResponseBody,
    RequestPasswordResetRequestBody,
    AuthenticateWithGoogleOauthRequestBody,
    ValidatePasswordResetTokenResponseBody,
    ValidatePasswordResetTokenRequestBody,
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

export async function sendSignOut(): Promise<SignOutResponseBody> {
    const rawResponse = await request.get('/authentication/sign-out');
    //Cannot clear token here, in case the current token is now invalid and then throws an error
    const parsedResponse = SignOutResponseBody.parse(rawResponse.data);

    return parsedResponse;
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
    if (SignInFailureResponseBody.safeParse(responseBody).success) {
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
    if (SignInFailureResponseBody.safeParse(responseBody).success) {
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
    const parsedResponseBody = ApiTokensSignUpResponseBody.parse(
        rawResponse.data,
    );
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
    const parsedResponseBody = WebAuthSignUpResponseBody.parse(
        rawResponse.data,
    );

    if (parsedResponseBody.status === 'FAILURE') {
        throw new SignUpError(parsedResponseBody.signUpFailureReasonCollection);
    }

    //useless parse below for type only
    return WebAuthSuccessfullSignUpResponseBody.parse(parsedResponseBody);
}

export async function sendSignUp(
    args: sendSignUpArgs,
): Promise<SignUpSuccessfullResponseBody> {
    if (SHOULD_USE_TOKEN_AUTH) {
        return await sendApiTokenSignUp(args);
    }

    return await sendWebAuthSignUp(args);
}

interface SendEmailConfirmationCodeArgs {
    code: string;
}

export async function sendEmailConfirmationCode({
    code,
}: SendEmailConfirmationCodeArgs): Promise<ConfirmEmailResponseBody> {
    const body: ConfirmEmailRequestBody = {
        token: code,
    };
    const rawResponse = await request.post(
        '/authentication/confirm-email',
        body,
        {
            validateStatus: (status) => status === 200 || status === 400,
        },
    );
    const parsedResponseBody = ConfirmEmailResponseBody.parse(rawResponse.data);

    return parsedResponseBody;
}

export async function sendResendingConfirmationEmail(): Promise<ResendConfirmationEmailResponseBody> {
    const rawResponse = await request.post(
        '/authentication/resend-confirmation-email',
        {},
        {
            validateStatus: (status) => status === 200 || status === 429,
        },
    );
    const parsedResponseBody = ResendConfirmationEmailResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponseBody;
}

interface SendRequestingPasswordResetArgs {
    email: string;
}

export async function sendRequestingPasswordReset({
    email,
}: SendRequestingPasswordResetArgs): Promise<RequestPasswordResetResponseBody> {
    const requestBody: RequestPasswordResetRequestBody = {
        email,
    };
    const rawResponse = await request.post(
        '/authentication/request-password-reset',
        requestBody,
        {
            validateStatus: (status) =>
                status === 200 || status === 404 || status === 429,
        },
    );
    const parsedResponseBody = RequestPasswordResetResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponseBody;
}

type sendAuthenticateWithGoogleAccountArgs = Omit<
    AuthenticateWithGoogleOauthRequestBody,
    'authenticationMode'
>;

async function sendApiTokenAuthenticateWithGoogleAccount({
    userGoogleAccessToken,
}: sendAuthenticateWithGoogleAccountArgs): Promise<void> {
    await request.post(
        '/authentication/authenticate-with-google-oauth',
        {
            userGoogleAccessToken,
            authenticationMode: 'api',
        } as AuthenticateWithGoogleOauthRequestBody,
        {
            validateStatus: () => true,
        },
    );

    return;
}
async function sendWebAuthAuthenticateWithGoogleAccount({
    userGoogleAccessToken,
}: sendAuthenticateWithGoogleAccountArgs): Promise<void> {
    await request.post(
        '/authentication/authenticate-with-google-oauth',
        {
            userGoogleAccessToken,
            authenticationMode: 'web',
        } as AuthenticateWithGoogleOauthRequestBody,
        {
            validateStatus: () => true,
        },
    );

    return;
}

export async function sendAuthenticateWithGoogleAccount(
    args: sendAuthenticateWithGoogleAccountArgs,
): Promise<void> {
    if (SHOULD_USE_TOKEN_AUTH) {
        return await sendApiTokenAuthenticateWithGoogleAccount(args);
    }

    return await sendWebAuthAuthenticateWithGoogleAccount(args);
}
///

interface SendValidatePasswordResetCodeArgs {
    code: string;
    email: string;
}

export async function sendValidatePasswordResetCode({
    code,
    email,
}: SendValidatePasswordResetCodeArgs): Promise<ValidatePasswordResetTokenResponseBody> {
    const requestBody: ValidatePasswordResetTokenRequestBody = {
        token: code,
        email,
    };
    const rawResponse = await request.post(
        '/authentication/validate-password-reset-token',
        requestBody,
        {
            validateStatus: (status) => status === 200 || status === 400,
        },
    );
    const parsedResponseBody = ValidatePasswordResetTokenResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponseBody;
}
