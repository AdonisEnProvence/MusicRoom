import * as z from 'zod';
import { UserSummary } from '.';

export const AuthenticationModeValues = z.enum(['web', 'api']);
export type AuthenticationModeValues = z.infer<typeof AuthenticationModeValues>;

export const SignUpSuccessfullResponseBody = z.object({
    token: z.string().optional(),
    userSummary: UserSummary,
    status: z.literal('SUCCESS'),
});

export type SignUpSuccessfullResponseBody = z.infer<
    typeof SignUpSuccessfullResponseBody
>;

export const SignUpResponseBody = z
    .object({
        status: z.enum([
            'UNAVAILABLE_EMAIL',
            'UNAVAILABLE_NICKNAME',
            'INVALID_EMAIL',
            'WEAK_PASSWORD',
        ]),
    })
    .or(SignUpSuccessfullResponseBody);
export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;

export const SignUpRequestBody = z.object({
    userNickname: z.string(),
    password: z.string(),
    email: z.string().email({ message: 'INVALID_EMAIL' }),
    authenticationMode: AuthenticationModeValues,
});

export type SignUpRequestBody = z.infer<typeof SignUpRequestBody>;
