import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
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
}
