import {
    UpdateDevicesVisibilityRequestBody,
    UpdateDevicesVisibilityResponseBody,
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

interface SetUserDevicesSettingVisibilityArgs {
    visibility: UserSettingVisibility;
}

export async function setUserDevicesSettingVisibility({
    visibility,
}: SetUserDevicesSettingVisibilityArgs): Promise<UpdateDevicesVisibilityResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/me/devices-visibility');
    const body: UpdateDevicesVisibilityRequestBody = {
        tmpAuthUserID: getFakeUserID(),
        visibility,
    };

    const rawResponse = await redaxios.post(url, body);
    const parsedResponse = UpdateDevicesVisibilityResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}
