import { createModel } from 'xstate/lib/model';
import { TrackMetadata } from '@musicroom/types';
import { forwardTo } from 'xstate';
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

            RESET: () => ({}),
        },
    },
);

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
                                target: 'fetchedTracks',

                                actions: assignTracksToContext,
                            },

                            FAILED_FETCHING_TRACKS: {
                                target: 'errFetchingTracks',
                            },
                        },
                    },

                    fetchedTracks: {
                        entry: ['navigateToResultsPage'],
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

                    RESET: {
                        target: 'steps.idle',

                        actions: forwardTo('searchBarMachine'),
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
