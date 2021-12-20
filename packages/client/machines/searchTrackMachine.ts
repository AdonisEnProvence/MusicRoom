import { createModel } from 'xstate/lib/model';
import { TrackMetadata } from '@musicroom/types';
import { ActorRefFrom } from 'xstate';
import { fetchTracksSuggestions } from '../services/search-tracks';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const searchTrackModel = createModel(
    {
        tracks: undefined as TrackMetadata[] | undefined,
    },
    {
        events: {
            FETCHED_TRACKS: (tracks: TrackMetadata[]) => ({ tracks }),
            FAILED_FETCHING_TRACKS: () => ({}),

            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            PRESS_TRACK: (trackID: string) => ({ trackID }),
        },
    },
);

export type SearchTrackActorRef = ActorRefFrom<typeof searchTrackMachine>;

const assignTracksToContext = searchTrackModel.assign(
    {
        tracks: (_context, event) => event.tracks,
    },
    'FETCHED_TRACKS',
);

export const searchTrackMachine = searchTrackModel.createMachine(
    {
        type: 'parallel',

        states: {
            steps: {
                initial: 'idle',

                states: {
                    idle: {},

                    fetchingTracks: {
                        invoke: {
                            src: 'fetchTracks',
                        },

                        on: {
                            FETCHED_TRACKS: {
                                target: 'idle',

                                actions: assignTracksToContext,
                            },

                            FAILED_FETCHING_TRACKS: {
                                target: 'errFetchingTracks',
                            },
                        },
                    },

                    errFetchingTracks: {},
                },

                on: {
                    SUBMITTED: {
                        cond: (_, { searchQuery }) => {
                            const isEmpty = searchQuery.length === 0;
                            const isNotEmpty = isEmpty === false;

                            return isNotEmpty === true;
                        },

                        target: 'steps.fetchingTracks',
                    },

                    CLEAR_QUERY: {
                        target: 'steps.idle',

                        actions: searchTrackModel.assign({
                            tracks: undefined,
                        }),
                    },

                    CANCEL: {
                        target: 'steps.idle',

                        actions: searchTrackModel.assign({
                            tracks: undefined,
                        }),
                    },

                    PRESS_TRACK: {
                        actions: 'handleTrackPressed',
                    },
                },
            },

            searchBar: {
                invoke: {
                    id: 'searchBarMachine',

                    src: appScreenHeaderWithSearchBarMachine,
                },
            },
        },
    },
    {
        services: {
            fetchTracks: (_context, event) => async (sendBack, _onReceive) => {
                if (event.type !== 'SUBMITTED') {
                    return;
                }

                const { searchQuery } = event;

                try {
                    const tracks = await fetchTracksSuggestions({
                        searchQuery,
                    });
                    if (tracks) {
                        sendBack({
                            type: 'FETCHED_TRACKS',
                            tracks,
                        });
                    }
                } catch (err) {
                    console.error(err);
                    sendBack({
                        type: 'FAILED_FETCHING_TRACKS',
                    });
                }
            },
        },
    },
);
