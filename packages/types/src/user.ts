import * as z from 'zod';

const SharedUserProfileInformation = z.object({
    userID: z.string().uuid(),
    userNickname: z.string(),
});
type SharedUserProfileInformation = z.infer<
    typeof SharedUserProfileInformation
>;

export const UserProfileInformation = SharedUserProfileInformation.extend({
    following: z.boolean(),
});
export type UserProfileInformation = z.infer<typeof UserProfileInformation>;

export const GetUserProfileInformationRequestBody = z.object({
    userID: z.string().uuid(),
    tmpAuthUserID: z.string().uuid(),
});
export type GetUserProfileInformationRequestBody = z.infer<
    typeof GetUserProfileInformationRequestBody
>;

export const GetUserProfileInformationResponseBody = UserProfileInformation;
export type GetUserProfileInformationResponseBody = z.infer<
    typeof GetUserProfileInformationResponseBody
>;
