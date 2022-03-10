import * as z from 'zod';
import { MpeRoomSummary } from './mpe';
import { PositiveInteger, StrictlyPositiveInteger } from './int';

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

export const GetMyProfileInformationResponseBody = MyProfileInformation;
export type GetMyProfileInformationResponseBody = z.infer<
    typeof GetMyProfileInformationResponseBody
>;

export const FollowUserRequestBody = z.object({
    userID: z.string().uuid(),
    tmpAuthUserID: z.string().uuid(),
});
export type FollowUserRequestBody = z.infer<typeof FollowUserRequestBody>;

export const FollowUserResponseBody = z.object({
    userProfileInformation: UserProfileInformation,
});
export type FollowUserResponseBody = z.infer<typeof FollowUserResponseBody>;

export const UnfollowUserRequestBody = z.object({
    userID: z.string().uuid(),
    tmpAuthUserID: z.string().uuid(),
});
export type UnfollowUserRequestBody = z.infer<typeof UnfollowUserRequestBody>;

export const UnfollowUserResponseBody = z.object({
    userProfileInformation: UserProfileInformation,
});
export type UnfollowUserResponseBody = z.infer<typeof UnfollowUserResponseBody>;

export const UserSearchMpeRoomsRequestBody = z.object({
    tmpAuthUserID: z.string().uuid(),
    userID: z.string().uuid(), // FIXME: use authentication
    searchQuery: z.string(),
    page: StrictlyPositiveInteger,
});
export type UserSearchMpeRoomsRequestBody = z.infer<
    typeof UserSearchMpeRoomsRequestBody
>;

export const UserSearchMpeRoomsResponseBody = z.object({
    page: StrictlyPositiveInteger,
    totalEntries: PositiveInteger,
    hasMore: z.boolean(),
    data: MpeRoomSummary.array(),
});
export type UserSearchMpeRoomsResponseBody = z.infer<
    typeof UserSearchMpeRoomsResponseBody
>;
