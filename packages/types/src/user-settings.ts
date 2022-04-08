import * as z from 'zod';

export const UserSettingVisibility = z.enum([
    'PUBLIC',
    'PRIVATE',
    'FOLLOWERS_ONLY',
]);
export type UserSettingVisibility = z.infer<typeof UserSettingVisibility>;

export const LinkGoogleAccountRequestBody = z.object({
    userGoogleAccessToken: z.string().nonempty(),
});
export type LinkGoogleAccountRequestBody = z.infer<
    typeof LinkGoogleAccountRequestBody
>;

export const LinkGoogleAccountFailureReason = z.enum(['UNAVAILABLE_GOOGLE_ID']);
export type LinkGoogleAccountFailureReason = z.infer<
    typeof LinkGoogleAccountFailureReason
>;

export const LinkGoogleAccountFailureResponseBody = z.object({
    status: z.literal('FAILURE'),
    linkGoogleAccountFailureReasons: z.array(LinkGoogleAccountFailureReason),
});
export type LinkGoogleAccountFailureResponseBody = z.infer<
    typeof LinkGoogleAccountFailureResponseBody
>;

export const LinkGoogleAccountSuccessResponseBody = z.object({
    status: z.literal('SUCCESS'),
});
export type LinkGoogleAccountSuccessResponseBody = z.infer<
    typeof LinkGoogleAccountSuccessResponseBody
>;

export const LinkGoogleAccountResponseBody = z.union([
    LinkGoogleAccountSuccessResponseBody,
    LinkGoogleAccountFailureResponseBody,
]);
export type LinkGoogleAccountResponseBody = z.infer<
    typeof LinkGoogleAccountResponseBody
>;
