import {
    UpdateNicknameRequestBody,
    UpdateNicknameResponseBody,
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UserSettingVisibility,
} from '@musicroom/types';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { getFakeUserID } from '../contexts/SocketContext';

interface SetUserPlaylistsSettingVisibilityArgs {
    visibility: UserSettingVisibility;
}

export async function setUserPlaylistsSettingVisibility({
    visibility,
}: SetUserPlaylistsSettingVisibilityArgs): Promise<UpdatePlaylistsVisibilityResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/me/playlists-visibility');
    const body: UpdatePlaylistsVisibilityRequestBody = {
        tmpAuthUserID: getFakeUserID(),
        visibility,
    };

    const rawResponse = await redaxios.post(url, body);
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
    const url = urlcat(SERVER_ENDPOINT, '/me/relations-visibility');
    const body: UpdateRelationsVisibilityRequestBody = {
        tmpAuthUserID: getFakeUserID(),
        visibility,
    };

    const rawResponse = await redaxios.post(url, body);
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
    const url = urlcat(SERVER_ENDPOINT, '/me/nickname');
    const body: UpdateNicknameRequestBody = {
        tmpAuthUserID: getFakeUserID(),

        nickname,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = UpdateNicknameResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
