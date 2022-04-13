import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    UpdatePlaylistsVisibilityRequestBody,
    UpdatePlaylistsVisibilityResponseBody,
    UpdateRelationsVisibilityRequestBody,
    UpdateRelationsVisibilityResponseBody,
    UpdateNicknameRequestBody,
    UpdateNicknameResponseBody,
    GetMySettingsResponseBody,
    LinkGoogleAccountResponseBody,
    LinkGoogleAccountRequestBody,
} from '@musicroom/types';
import SettingVisibility from 'App/Models/SettingVisibility';
import User from 'App/Models/User';
import { AuthenticationService } from 'App/Services/AuthenticationService';
import invariant from 'tiny-invariant';

export default class UserSettingsController {
    public async getMySettings({
        bouncer,
        auth,
    }: HttpContextContract): Promise<GetMySettingsResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to get her settings',
        );
        await bouncer.authorize('hasVerifiedAccount');

        await user.load((loader) => {
            loader
                .load('playlistsVisibilitySetting')
                .load('relationsVisibilitySetting');
        });

        const hasLinkedGoogleAccount =
            user.googleID !== null && user.googleID !== undefined;

        return {
            nickname: user.nickname,
            hasLinkedGoogleAccount,
            playlistsVisibilitySetting: user.playlistsVisibilitySetting.name,
            relationsVisibilitySetting: user.relationsVisibilitySetting.name,
        };
    }

    public async updatePlaylistsVisibility({
        request,
        bouncer,
        auth,
    }: HttpContextContract): Promise<UpdatePlaylistsVisibilityResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to update her playlists visibility setting',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { visibility } = UpdatePlaylistsVisibilityRequestBody.parse(
            request.body(),
        );
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
        bouncer,
        auth,
    }: HttpContextContract): Promise<UpdateRelationsVisibilityResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to update her relations visibility setting',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { visibility } = UpdateRelationsVisibilityRequestBody.parse(
            request.body(),
        );
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

    public async updateNickname({
        request,
        auth,
        bouncer,
        response,
    }: HttpContextContract): Promise<UpdateNicknameResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to update her nickname',
        );
        await bouncer.authorize('hasVerifiedAccount');

        const { nickname } = UpdateNicknameRequestBody.parse(request.body());

        if (user.nickname === nickname) {
            return {
                status: 'SAME_NICKNAME',
            };
        }

        try {
            user.nickname = nickname;

            await user.save();

            return {
                status: 'SUCCESS',
            };
        } catch (err: unknown) {
            response.status(400);
            return {
                status: 'UNAVAILABLE_NICKNAME',
            };
        }
    }

    public async linkGoogleAccount({
        auth,
        bouncer,
        response,
        request,
    }: HttpContextContract): Promise<LinkGoogleAccountResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be logged in to update her nickname',
        );
        await bouncer.authorize('canLinkGoogleAccount');

        const { userGoogleAccessToken } = LinkGoogleAccountRequestBody.parse(
            request.body(),
        );

        const userGoogleInformation =
            await AuthenticationService.getUserGoogleInformationFromUserGoogleAccessToken(
                userGoogleAccessToken,
            );
        const existingUserWithMatchingGoogleID = await User.findBy(
            'google_id',
            userGoogleInformation.sub,
        );

        const userWithMatchingGoogleIDExists =
            existingUserWithMatchingGoogleID !== null;
        if (userWithMatchingGoogleIDExists) {
            response.status(400);
            return {
                status: 'FAILURE',
                linkGoogleAccountFailureReasons: ['UNAVAILABLE_GOOGLE_ID'],
            };
        }

        user.googleID = userGoogleInformation.sub;
        await user.save();

        return {
            status: 'SUCCESS',
        };
    }
}
