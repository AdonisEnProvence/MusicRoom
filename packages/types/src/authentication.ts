import * as z from 'zod';
import { UserSummary } from './search-users';

export const AuthenticationModeValues = z.enum(['web', 'api']);
export type AuthenticationModeValues = z.infer<typeof AuthenticationModeValues>;

export const SignInRequestBody = z.object({
    email: z.string().email(),
    password: z.string(),
    authenticationMode: AuthenticationModeValues,
});
export type SignInRequestBody = z.infer<typeof SignInRequestBody>;

export const SignInSuccessfulWebAuthResponseBody = z.object({
    userSummary: UserSummary,
    status: z.literal('SUCCESS'),
});
export type SignInSuccessfulWebAuthResponseBody = z.infer<
    typeof SignInSuccessfulWebAuthResponseBody
>;

export const SignInSuccessfulApiTokensResponseBody = z.object({
    token: z.string(),
    userSummary: UserSummary,
    status: z.literal('SUCCESS'),
});
export type SignInSuccessfulApiTokensResponseBody = z.infer<
    typeof SignInSuccessfulApiTokensResponseBody
>;

export const SignInFailureResponseBody = z.object({
    status: z.literal('INVALID_CREDENTIALS'),
});
export type SignInFailureResponseBody = z.infer<
    typeof SignInFailureResponseBody
>;

export const SignInSuccessfulResponseBody = z.union([
    SignInSuccessfulWebAuthResponseBody,
    SignInSuccessfulApiTokensResponseBody,
]);
export type SignInSuccessfulResponseBody = z.infer<
    typeof SignInSuccessfulResponseBody
>;

export const SignInResponseBody = z.union([
    SignInSuccessfulResponseBody,
    SignInFailureResponseBody,
]);
export type SignInResponseBody = z.infer<typeof SignInResponseBody>;

export type SignInResponseBodyStatus = SignInResponseBody['status'];

//Sign up
export const WebAuthSuccessfullSignUpResponseBody = z.object({
    userSummary: UserSummary,
    status: z.literal('SUCCESS'),
});
export type WebAuthSuccessfullSignUpResponseBody = z.infer<
    typeof WebAuthSuccessfullSignUpResponseBody
>;

export const ApiTokensSuccessfullSignUpResponseBody = z.object({
    token: z.string(),
    userSummary: UserSummary,
    status: z.literal('SUCCESS'),
});
export type ApiTokensSuccessfullSignUpResponseBody = z.infer<
    typeof ApiTokensSuccessfullSignUpResponseBody
>;

export const SignUpSuccessfullResponseBody =
    WebAuthSuccessfullSignUpResponseBody.or(
        ApiTokensSuccessfullSignUpResponseBody,
    );
export type SignUpSuccessfullResponseBody = z.infer<
    typeof SignUpSuccessfullResponseBody
>;

export const SignUpFailureReasons = z.enum([
    'UNAVAILABLE_NICKNAME',
    'UNAVAILABLE_EMAIL',
    'INVALID_EMAIL',
    'INVALID_NICKNAME',
    'WEAK_PASSWORD',
]);
export type SignUpFailureReasons = z.infer<typeof SignUpFailureReasons>;

export const SignUpFailureResponseBody = z.object({
    status: z.literal('FAILURE'),
    signUpFailureReasonCollection: SignUpFailureReasons.array(),
});
export type SignUpFailureResponseBody = z.infer<
    typeof SignUpFailureResponseBody
>;

export const ApiTokensSignUpResponseBody = SignUpFailureResponseBody.or(
    ApiTokensSuccessfullSignUpResponseBody,
);
export type ApiTokensSignUpResponseBody = z.infer<
    typeof ApiTokensSignUpResponseBody
>;

export const WebAuthSignUpResponseBody = SignUpFailureResponseBody.or(
    WebAuthSuccessfullSignUpResponseBody,
);
export type WebAuthSignUpResponseBody = z.infer<
    typeof WebAuthSignUpResponseBody
>;

export const SignUpResponseBody = WebAuthSignUpResponseBody.or(
    ApiTokensSignUpResponseBody,
);
export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;

export const SignUpRequestBody = z.object({
    userNickname: z.string(),
    password: z.string(),
    email: z.string(),
    authenticationMode: AuthenticationModeValues,
});

export type SignUpRequestBody = z.infer<typeof SignUpRequestBody>;

/**
 * A valid password is a string with eight or more characters.
 * Characters are of any type.
 */
export const passwordStrengthRegex = /^.{8,}$/;

export const SignOutResponseBody = z.object({
    status: z.literal('SUCCESS'),
});

export type SignOutResponseBody = z.infer<typeof SignOutResponseBody>;

export const ConfirmEmailRequestBody = z.object({
    token: z.string(),
});
export type ConfirmEmailRequestBody = z.infer<typeof ConfirmEmailRequestBody>;

export const ConfirmEmailResponseBody = z.object({
    status: z.enum(['SUCCESS', 'INVALID_TOKEN']),
});
export type ConfirmEmailResponseBody = z.infer<typeof ConfirmEmailResponseBody>;

export const ResendConfirmationEmailResponseBody = z.object({
    status: z.enum(['SUCCESS', 'REACHED_RATE_LIMIT']),
});
export type ResendConfirmationEmailResponseBody = z.infer<
    typeof ResendConfirmationEmailResponseBody
>;

export const RequestPasswordResetRequestBody = z.object({
    email: z.string().email(),
});
export type RequestPasswordResetRequestBody = z.infer<
    typeof RequestPasswordResetRequestBody
>;

export const RequestPasswordResetResponseBody = z.object({
    status: z.enum(['SUCCESS', 'REACHED_RATE_LIMIT', 'INVALID_EMAIL']),
});
export type RequestPasswordResetResponseBody = z.infer<
    typeof RequestPasswordResetResponseBody
>;

export const ValidatePasswordResetTokenRequestBody = z.object({
    email: z.string().email(),
    token: z.string(),
});
export type ValidatePasswordResetTokenRequestBody = z.infer<
    typeof ValidatePasswordResetTokenRequestBody
>;

export const ValidatePasswordResetTokenResponseBody = z.object({
    status: z.enum(['SUCCESS', 'INVALID_TOKEN']),
});
export type ValidatePasswordResetTokenResponseBody = z.infer<
    typeof ValidatePasswordResetTokenResponseBody
>;

//Google auth
export const GoogleAuthenticationFailureReasons = z.enum([
    'UNAVAILABLE_NICKNAME',
    'UNAVAILABLE_EMAIL',
    'INVALID_EMAIL',
    'INVALID_NICKNAME',
    'UNAVAILABLE_GOOGLE_ID',
]);
export type GoogleAuthenticationFailureReasons = z.infer<
    typeof GoogleAuthenticationFailureReasons
>;

export const AuthenticateWithGoogleOauthRequestBody = z.object({
    userGoogleAccessToken: z.string().nonempty(),
    authenticationMode: AuthenticationModeValues,
});
export type AuthenticateWithGoogleOauthRequestBody = z.infer<
    typeof AuthenticateWithGoogleOauthRequestBody
>;

//add optionnal token
export const WebAuthAuthenticateWithGoogleOauthSuccessResponseBody = z.object({
    status: z.literal('SUCCESS'),
});
export type WebAuthAuthenticateWithGoogleOauthSuccessResponseBody = z.infer<
    typeof WebAuthAuthenticateWithGoogleOauthSuccessResponseBody
>;

export const ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody = z.object({
    status: z.literal('SUCCESS'),
    token: z.string(),
});
export type ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody = z.infer<
    typeof ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody
>;

export const AuthenticateWithGoogleOauthFailureReponseBody = z.object({
    status: z.literal('FAILURE'),
    googleAuthSignUpFailure: GoogleAuthenticationFailureReasons.array(),
});
export type AuthenticateWithGoogleOauthFailureReponseBody = z.infer<
    typeof AuthenticateWithGoogleOauthFailureReponseBody
>;

export const AuthenticateWithGoogleOauthResponseBody =
    WebAuthAuthenticateWithGoogleOauthSuccessResponseBody.or(
        ApiTokenAuthenticateWithGoogleOauthSuccessResponseBody,
    ).or(AuthenticateWithGoogleOauthFailureReponseBody);
export type AuthenticateWithGoogleOauthResponseBody = z.infer<
    typeof AuthenticateWithGoogleOauthResponseBody
>;
///
