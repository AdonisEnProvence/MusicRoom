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

Route.get('/proxy-places-api/*', 'PlacesApisController.proxyPlacesAPIRequest');

/// Temporal MTV Routes ///

const MTV_TEMPORAL_LISTENER = `/temporal/mtv`;

Route.post(
    `${MTV_TEMPORAL_LISTENER}/mtv-creation-acknowledgement`,
    'Temporal/MtvTemporalToServerController.mtvCreationAcknowledgement',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/play`,
    'Temporal/MtvTemporalToServerController.play',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/pause`,
    'Temporal/MtvTemporalToServerController.pause',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/join`,
    'Temporal/MtvTemporalToServerController.join',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/leave`,
    'Temporal/MtvTemporalToServerController.leave',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/change-user-emitting-device`,
    'Temporal/MtvTemporalToServerController.mtvChangeUserEmittingDeviceAcknowledgement',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/user-length-update`,
    'Temporal/MtvTemporalToServerController.userLengthUpdate',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/suggest-or-vote-update`,
    'Temporal/MtvTemporalToServerController.suggestOrVoteTracksListUpdate',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-tracks-suggestion`,
    'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestion',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-tracks-suggestion-fail`,
    'Temporal/MtvTemporalToServerController.acknowledgeTracksSuggestionFail',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-user-vote-for-track`,
    'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-update-user-fits-position-constraint`,
    'Temporal/MtvTemporalToServerController.acknowledgeUserVoteForTrack',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-update-delegation-owner`,
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateDelegationOwner',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-update-control-and-delegation-permission`,
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateControlAndDelegationPermission',
);

Route.post(
    `${MTV_TEMPORAL_LISTENER}/acknowledge-update-time-constraint`,
    'Temporal/MtvTemporalToServerController.acknowledgeUpdateTimeConstraint',
);

/// //////// ////// ///

Route.get('/', () => {
    return { hello: 'world' };
});
