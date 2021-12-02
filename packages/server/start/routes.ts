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

Route.get('/search/track/:query', 'TracksSearchesController.searchTrackName');

Route.post('/search/rooms', 'MtvRoomsHttpController.fetchMtvRooms');

Route.post('/search/users', 'SearchUsersController.searchUsers');

Route.get('/ping', () => console.log('pong'));

/// Temporal Routes ///

Route.post(
    '/temporal/mtv-creation-acknowledgement',
    'Temporal/MtvTemporalToServerController.mtvCreationAcknowledgement',
);

Route.post('/temporal/play', 'Temporal/MtvTemporalToServerController.play');

Route.post('/temporal/pause', 'Temporal/MtvTemporalToServerController.pause');

Route.post('/temporal/join', 'Temporal/MtvTemporalToServerController.join');

Route.post('/temporal/leave', 'Temporal/MtvTemporalToServerController.leave');

Route.post(
    '/temporal/change-user-emitting-device',
    'Temporal/MtvTemporalToServerController.mtvChangeUserEmittingDeviceAcknowledgement',
);

Route.post(
    'temporal/user-length-update',
    'Temporal/MtvTemporalToServerController.userLengthUpdate',
);

Route.post(
    '/temporal/suggest-or-vote-update',
    'Temporal/MtvTemporalToServerController.suggestOrVoteTracksListUpdate',
);

Route.post(
    '/temporal/acknowledge-tracks-suggestion',
    'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestion',
);

Route.post(
    '/temporal/acknowledge-tracks-suggestion-fail',
    'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestionFail',
);

Route.post(
    '/temporal/acknowledge-user-vote-for-track',
    'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
);

Route.get('/proxy-places-api/*', 'PlacesApisController.proxyPlacesAPIRequest');

Route.post(
    '/temporal/acknowledge-update-user-fits-position-constraint',
    'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
);

Route.post(
    '/temporal/acknowledge-update-delegation-owner',
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateDelegationOwner',
);

Route.post(
    '/temporal/acknowledge-update-control-and-delegation-permission',
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateControlAndDelegationPermission',
);

Route.post(
    '/temporal/acknowledge-update-time-constraint',
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateTimeConstraint',
);

/// //////// ////// ///

Route.get('/', () => {
    return { hello: 'world' };
});
