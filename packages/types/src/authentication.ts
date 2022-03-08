import * as z from 'zod';
import { UserSummary } from '.';

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

export const SignUpResponseBody = SignUpFailureResponseBody.or(
    SignUpSuccessfullResponseBody,
);

export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;

export const SignUpRequestBody = z.object({
    userNickname: z.string(),
    password: z.string(),
    email: z.string(),
    authenticationMode: AuthenticationModeValues,
});

export type SignUpRequestBody = z.infer<typeof SignUpRequestBody>;

// Inspired by https://stackoverflow.com/questions/5142103/regex-to-validate-password-strength
// Password has to have 2 caps letter one special char 2 digits and 3 lowercase char and minimal length has to be 8
// Valid password examples: ':net66LTW', 'RN4k`d8he9k.'
// Invalid password examples: 'bestpasswor@1', 'abcqwerty', 'ABCWE'
export const passwordStrengthRegex =
    /^(?=.*[A-Z].*[A-Z])(?=.*[!#$:@+%&'*+/\\=?^_`{|}~-])(?=.*[0-9].*[0-9])(?=.*[a-z].*[a-z].*[a-z]).{8,}$/;
