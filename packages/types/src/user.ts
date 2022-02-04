import * as z from 'zod';
import { StrictlyPositiveInteger } from './int';

const SharedUserProfileInformation = z.object({
    userID: z.string().uuid(),
    userNickname: z.string(),
});
type SharedUserProfileInformation = z.infer<
    typeof SharedUserProfileInformation
>;

//User profile information
export const UserProfileInformation = SharedUserProfileInformation.extend({
    following: z.boolean(),
    playlistsCounter: z.number().optional(),
    followersCounter: z.number().optional(),
    followingCounter: z.number().optional(),
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

//my profile information

export const MyProfileInformation = SharedUserProfileInformation.extend({
    devicesCounter: StrictlyPositiveInteger,
    playlistsCounter: z.number(),
    followersCounter: z.number(),
    followingCounter: z.number(),
});
export type MyProfileInformation = z.infer<typeof MyProfileInformation>;

export const GetMyProfileInformationRequestBody = z.object({
    tmpAuthUserID: z.string().uuid(),
});
export type GetMyProfileInformationRequestBody = z.infer<
    typeof GetMyProfileInformationRequestBody
>;

export const GetMyProfileInformationResponseBody = MyProfileInformation;
export type GetMyProfileInformationResponseBody = z.infer<
    typeof GetMyProfileInformationResponseBody
>;
