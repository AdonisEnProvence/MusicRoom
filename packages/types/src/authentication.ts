import * as z from 'zod';

export const SignUpRequestBody = z.object({
    userNickname: z.string(),
});
export type SignUpRequestBody = z.infer<typeof SignUpRequestBody>;

export const SignUpResponseBody = z.object({
    userID: z.string().uuid(),
});
export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;
