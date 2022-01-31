import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UpdateDevicesVisibilityRequestBody,
    UpdateDevicesVisibilityResponseBody,
} from '@musicroom/types';
import SettingVisibility from 'App/Models/SettingVisibility';
import User from 'App/Models/User';

export default class UserSettingsController {
    public async updatePlaylistsVisibility({
        request,
    }: HttpContextContract): Promise<UpdatePlaylistsVisibilityResponseBody> {
        const rawBody = request.body();
        const { tmpAuthUserID, visibility } =
            UpdatePlaylistsVisibilityRequestBody.parse(rawBody);

        const user = await User.findOrFail(tmpAuthUserID);
        const settingVisibility = await SettingVisibility.findByOrFail(
            'name',
            visibility,
        );

        await user
            .related('playlistsVisibilitySetting')
            .associate(settingVisibility);

        return {
            status: 'SUCCESS',
        };
    }

    public async updateRelationsVisibility({
        request,
    }: HttpContextContract): Promise<UpdateRelationsVisibilityResponseBody> {
        const rawBody = request.body();
        const { tmpAuthUserID, visibility } =
            UpdateRelationsVisibilityRequestBody.parse(rawBody);

        const user = await User.findOrFail(tmpAuthUserID);
        const settingVisibility = await SettingVisibility.findByOrFail(
            'name',
            visibility,
        );

        await user
            .related('relationsVisibilitySetting')
            .associate(settingVisibility);

        return {
            status: 'SUCCESS',
        };
    }

    public async updateDevicesVisibility({
        request,
    }: HttpContextContract): Promise<UpdateDevicesVisibilityResponseBody> {
        const rawBody = request.body();
        const { tmpAuthUserID, visibility } =
            UpdateDevicesVisibilityRequestBody.parse(rawBody);

        const user = await User.findOrFail(tmpAuthUserID);
        const settingVisibility = await SettingVisibility.findByOrFail(
            'name',
            visibility,
        );

        await user
            .related('devicesVisibilitySetting')
            .associate(settingVisibility);

        return {
            status: 'SUCCESS',
        };
    }
}
