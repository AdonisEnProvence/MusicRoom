import {
    FollowUserRequestBody,
    FollowUserResponseBody,
    GetUserProfileInformationRequestBody,
    GetUserProfileInformationResponseBody,
    UnfollowUserRequestBody,
    UnfollowUserResponseBody,
} from '@musicroom/types';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function sendFollowUser(
    body: FollowUserRequestBody,
): Promise<FollowUserResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/user/follow');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = FollowUserResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function sendUnfollowUser(
    body: UnfollowUserRequestBody,
): Promise<UnfollowUserResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/user/unfollow');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = UnfollowUserResponseBody.parse(rawResponse.data);

    return parsedBody;
}

export async function getUserProfileInformation(
    body: GetUserProfileInformationRequestBody,
): Promise<GetUserProfileInformationResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/user/profile-information');

    const rawResponse = await redaxios.post(url, body);
    const parsedBody = GetUserProfileInformationResponseBody.parse(
        rawResponse.data,
    );

    return parsedBody;
}
