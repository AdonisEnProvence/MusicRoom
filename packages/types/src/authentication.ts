import * as z from 'zod';

export const SignUpResponseBody = z.object({
    userID: z.string().uuid(),
    userNickname: z.string(),
});
export type SignUpResponseBody = z.infer<typeof SignUpResponseBody>;
