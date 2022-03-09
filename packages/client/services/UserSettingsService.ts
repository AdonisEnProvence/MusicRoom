import {
    GetMySettingsRequestBody,
    GetMySettingsResponseBody,
    UpdateNicknameRequestBody,
    UpdateNicknameResponseBody,
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import { getFakeUserID } from '../contexts/SocketContext';
import { request } from './http';

export async function getMySettings(): Promise<GetMySettingsResponseBody> {
    const body: GetMySettingsRequestBody = {
        tmpAuthUserID: getFakeUserID(),
    };

    const rawResponse = await request.post('/me/settings', body);
    const parsedResponse = GetMySettingsResponseBody.parse(rawResponse.data);

    return parsedResponse;
}

interface SetUserPlaylistsSettingVisibilityArgs {
    visibility: UserSettingVisibility;
}

export async function setUserPlaylistsSettingVisibility({
    visibility,
}: SetUserPlaylistsSettingVisibilityArgs): Promise<UpdatePlaylistsVisibilityResponseBody> {
    const body: UpdatePlaylistsVisibilityRequestBody = {
        tmpAuthUserID: getFakeUserID(),
        visibility,
    };

    const rawResponse = await request.post('/me/playlists-visibility', body);
    const parsedResponse = UpdatePlaylistsVisibilityResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}

interface SetUserRelationsSettingVisibilityArgs {
    visibility: UserSettingVisibility;
}

export async function setUserRelationsSettingVisibility({
    visibility,
}: SetUserRelationsSettingVisibilityArgs): Promise<UpdateRelationsVisibilityResponseBody> {
    const body: UpdateRelationsVisibilityRequestBody = {
        tmpAuthUserID: getFakeUserID(),
        visibility,
    };

    const rawResponse = await request.post('/me/relations-visibility', body);
    const parsedResponse = UpdateRelationsVisibilityResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}

interface SetUserNicknameArgs {
    nickname: string;
}

export async function setUserNickname({
    nickname,
}: SetUserNicknameArgs): Promise<UpdateNicknameResponseBody> {
    const body: UpdateNicknameRequestBody = {
        tmpAuthUserID: getFakeUserID(),

        nickname,
    };

    const rawResponse = await request.post('/me/nickname', body);
    const parsedResponse = UpdateNicknameResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
