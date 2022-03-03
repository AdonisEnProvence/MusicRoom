import * as z from 'zod';

export const AuthenticationModeValues = z.enum(['web', 'api']);
export type AuthenticationModeValues = z.infer<typeof AuthenticationModeValues>;

export const SignUpResponseBody = z.object({
    token: z.string().optional(),
    status: z.enum([
        'SAME_NICKNAME',
        'SUCCESS',
        'SAME_EMAIL',
        'BAD_EMAIL',
        'WEAK_PASSWORD',
    ]),
});
export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;

export const SignUpRequestBody = z.object({
    userNickname: z.string(),
    password: z.string(),
    email: z.string().email(),
    authenticationMode: AuthenticationModeValues,
});

export type SignUpRequestBody = z.infer<typeof SignUpRequestBody>;
