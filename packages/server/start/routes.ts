/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/
// import Redis from '@ioc:Adonis/Addons/Redis';
import Route from '@ioc:Adonis/Core/Route';
import AutoSwagger from 'adonis-autoswagger';

export const MPE_TEMPORAL_LISTENER = `/temporal/mpe`;
export const MY_PROFILE_ROUTES_GROUP_PREFIX = '/me';
export const USER_ROUTES_GROUP_PREFIX = '/user';
export const AUTHENTICATION_ROUTES_GROUP_PREFIX = '/authentication';
export const MTV_TEMPORAL_LISTENER = `/temporal/mtv`;

Route.group(() => {
    Route.get(
        '/search/track/:query',
        'TracksSearchesController.searchTrackName',
    ).middleware('every-auth');

    Route.post(
        '/search/rooms',
        'MtvRoomsHttpController.fetchMtvRooms',
    ).middleware('every-auth');

    Route.post('/search/users', 'SearchUsersController.searchUsers').middleware(
        'every-auth',
    );

    Route.get(
        '/proxy-places-api/*',
        'PlacesApisController.proxyPlacesAPIRequest',
    );

    Route.post(
        '/mpe/search/my-rooms',
        'MpeRoomsHttpController.listMyRooms',
    ).middleware('every-auth');

    Route.post(
        '/mpe/search/all-rooms',
        'MpeRoomsHttpController.listAllRooms',
    ).middleware('every-auth');

    Route.group(() => {
        Route.get(
            '/profile-information',
            'MyProfileController.getMyProfileInformation',
        );
        Route.get('/settings', 'UserSettingsController.getMySettings');
        Route.post(
            '/playlists-visibility',
            'UserSettingsController.updatePlaylistsVisibility',
        );
        Route.post(
            '/relations-visibility',
            'UserSettingsController.updateRelationsVisibility',
        );
        Route.post('/nickname', 'UserSettingsController.updateNickname');
        Route.post(
            '/search/followers',
            'SearchUsersController.listMyFollowers',
        );
        Route.post(
            '/search/following',
            'SearchUsersController.listMyFollowing',
        );

        Route.post(
            '/link-google-account',
            'UserSettingsController.linkGoogleAccount',
        );
    })
        .prefix(MY_PROFILE_ROUTES_GROUP_PREFIX)
        .middleware('every-auth');

    Route.group(() => {
        Route.post(
            '/profile-information',
            'UserProfileController.getUserProfileInformation',
        );
        Route.post('/follow', 'UserProfileController.followUser');
        Route.post('/unfollow', 'UserProfileController.unfollowUser');
        Route.post(
            '/search/followers',
            'SearchUsersController.listUserFollowers',
        );
        Route.post(
            '/search/following',
            'SearchUsersController.listUserFollowing',
        );
        Route.post('/search/mpe', 'UserProfileController.listUserMpeRooms');
    })
        .prefix(USER_ROUTES_GROUP_PREFIX)
        .middleware('every-auth');

    Route.group(() => {
        Route.post('/sign-up', 'AuthenticationController.signUp');
        Route.post('/sign-in', 'AuthenticationController.signIn');
        Route.get('/sign-out', 'AuthenticationController.signOut').middleware(
            'every-auth',
        );
        Route.post(
            '/authenticate-with-google-oauth',
            'AuthenticationController.authenticateWithGoogleOauth',
        );
        Route.post(
            '/confirm-email',
            'AuthenticationController.confirmEmail',
        ).middleware('every-auth');
        Route.post(
            '/resend-confirmation-email',
            'AuthenticationController.resendConfirmationEmail',
        ).middleware('every-auth');
        Route.post(
            '/request-password-reset',
            'AuthenticationController.requestPasswordReset',
        );
        Route.post(
            '/validate-password-reset-token',
            'AuthenticationController.validatePasswordResetToken',
        );
        Route.post('/reset-password', 'AuthenticationController.resetPassword');
    }).prefix(AUTHENTICATION_ROUTES_GROUP_PREFIX);

    /// Temporal MTV Routes ///

    Route.group(() => {
        Route.post(
            `/mtv-creation-acknowledgement`,
            'Temporal/MtvTemporalToServerController.mtvCreationAcknowledgement',
        );

        Route.post(`/play`, 'Temporal/MtvTemporalToServerController.play');

        Route.post(`/pause`, 'Temporal/MtvTemporalToServerController.pause');

        Route.post(`/join`, 'Temporal/MtvTemporalToServerController.join');

        Route.post(`/leave`, 'Temporal/MtvTemporalToServerController.leave');

        Route.post(
            `/change-user-emitting-device`,
            'Temporal/MtvTemporalToServerController.mtvChangeUserEmittingDeviceAcknowledgement',
        );

        Route.post(
            `/user-length-update`,
            'Temporal/MtvTemporalToServerController.userLengthUpdate',
        );

        Route.post(
            `/suggest-or-vote-update`,
            'Temporal/MtvTemporalToServerController.suggestOrVoteTracksListUpdate',
        );

        Route.post(
            `/acknowledge-tracks-suggestion`,
            'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestion',
        );

        Route.post(
            `/acknowledge-tracks-suggestion-fail`,
            'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestionFail',
        );

        Route.post(
            `/acknowledge-user-vote-for-track`,
            'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
        );

        Route.post(
            `/acknowledge-update-user-fits-position-constraint`,
            'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
        );

        Route.post(
            `/acknowledge-update-delegation-owner`,
            'Temporal/MtvTemporalToServerController.acknowledgeUpdateDelegationOwner',
        );

        Route.post(
            `/acknowledge-update-control-and-delegation-permission`,
            'Temporal/MtvTemporalToServerController.acknowledgeUpdateControlAndDelegationPermission',
        );

        Route.post(
            `/acknowledge-update-time-constraint`,
            'Temporal/MtvTemporalToServerController.acknowledgeUpdateTimeConstraint',
        );
    })
        .prefix(MTV_TEMPORAL_LISTENER)
        .middleware('temporal-adonis-auth');

    /// //////// ////// ///

    /// Temporal MPE Routes ///

    Route.group(() => {
        Route.post(
            `/mpe-creation-acknowledgement`,
            'Temporal/MpeTemporalToServerController.mpeCreationAcknowledgement',
        );

        Route.post(
            `/reject-adding-tracks`,
            'Temporal/MpeTemporalToServerController.addingTracksRejection',
        );

        Route.post(
            `/acknowledge-adding-tracks`,
            'Temporal/MpeTemporalToServerController.addingTracksAcknowledgement',
        );

        Route.post(
            `/acknowledge-change-track-order`,
            'Temporal/MpeTemporalToServerController.changeTrackOrderAcknowledgement',
        );
        Route.post(
            `/reject-change-track-order`,
            'Temporal/MpeTemporalToServerController.changeTrackOrderRejection',
        );

        Route.post(
            `/acknowledge-deleting-tracks`,
            'Temporal/MpeTemporalToServerController.deleteTracksAcknowledgement',
        );

        Route.post(
            `/acknowledge-join`,
            `Temporal/MpeTemporalToServerController.mpeJoinAcknowledgement`,
        );

        Route.post(
            `/request-mtv-room-creation`,
            'Temporal/MpeTemporalToServerController.requestMtvRoomCreation',
        );

        Route.post(
            `/acknowledge-leave`,
            `Temporal/MpeTemporalToServerController.mpeLeaveAcknowledgement`,
        );
    })
        .prefix(MPE_TEMPORAL_LISTENER)
        .middleware('temporal-adonis-auth');

    const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';
    if (nodeEnvIsDevelopment) {
        const TEST_GROUP_PREFIX = `/test`;

        Route.group(() => {
            Route.get(
                '/bypass-email-confirmation',
                'TestEnvMethodController.bypassUserEmailConfirmation',
            ).middleware('every-auth');

            Route.post(
                '/toggle-mail-trap',
                'TestEnvMethodController.toggleMailTrap',
            );
        }).prefix(TEST_GROUP_PREFIX);

        Route.get('/email/:template', async ({ request, view }) => {
            const template = request.param('template');

            const { default: mjml } = await import('mjml');

            return mjml(
                await view.render(`emails/${template}`, {
                    nickname: 'Baba',
                    token: '897632',
                }),
            ).html;
        });
    }
    /// //////// ////// ///

    Route.get('/', () => {
        return { hello: 'world' };
    });

    // returns swagger in YAML
    Route.get('/swagger', async () => {
        return AutoSwagger.docs(Route.toJSON(), {
            path: __dirname,
            title: 'Foo',
            version: '1.0.0',
            snakeCase: false,
            tagIndex: 2,
            ignore: [
                '/swagger',
                '/docs',
                '/test/bypass-email-confirmation',
                '/',
                '/test/email/:template',
                '/test/toggle-mail-trap',
                `/temporal/mpe/mpe-creation-acknowledgement`,
                `/temporal/mpe/reject-adding-tracks`,
                `/temporal/mpe/acknowledge-adding-tracks`,
                `/temporal/mpe/acknowledge-change-track-order`,
                `/temporal/mpe/reject-change-track-order`,
                `/temporal/mpe/acknowledge-deleting-tracks`,
                `/temporal/mpe/acknowledge-join`,
                `/temporal/mpe/request-mtv-room-creation`,
                `/temporal/mpe/acknowledge-leave`,
                `/temporal/mtv/mtv-creation-acknowledgement`,
                `/temporal/mtv/play`,
                `/temporal/mtv/pause`,
                `/temporal/mtv/join`,
                `/temporal/mtv/leave`,
                `/temporal/mtv/change-user-emitting-device`,
                `/temporal/mtv/user-length-update`,
                `/temporal/mtv/suggest-or-vote-update`,
                `/temporal/mtv/acknowledge-tracks-suggestion`,
                `/temporal/mtv/acknowledge-tracks-suggestion-fail`,
                `/temporal/mtv/acknowledge-user-vote-for-track`,
                `/temporal/mtv/acknowledge-update-user-fits-position-constraint`,
                `/temporal/mtv/acknowledge-update-delegation-owner`,
                `/temporal/mtv/acknowledge-update-control-and-delegation-permission`,
                `/temporal/mtv/acknowledge-update-time-constraint`,
            ],
            common: {
                parameters: {}, // OpenAPI conform parameters that are commonly used
                headers: {}, // OpenAPI confomr headers that are commonly used
            },
        });
    });

    // Renders Swagger-UI and passes YAML-output of /swagger
    Route.get('/docs', async () => {
        return AutoSwagger.ui('/swagger');
    });
}).middleware('logger-middleware');
