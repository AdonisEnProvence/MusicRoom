import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
} from '@musicroom/types';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { request } from './http';

export async function sendFollowUser(
    body: FollowUserRequestBody,
): Promise<FollowUserResponseBody> {
    const rawResponse = await request.post('/user/follow', body);
    const parsedBody = FollowUserResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function sendUnfollowUser(
    body: UnfollowUserRequestBody,
): Promise<UnfollowUserResponseBody> {
    const rawResponse = await request.post('/user/unfollow', body);
    const parsedBody = UnfollowUserResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function getUserProfileInformation(
    body: GetUserProfileInformationRequestBody,
): Promise<GetUserProfileInformationResponseBody> {
    const rawResponse = await request.post('/user/profile-information', body);
    const parsedBody = GetUserProfileInformationResponseBody.parse(
        rawResponse.data,
    );

    return parsedBody;
}
