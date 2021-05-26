import { assign, createMachine } from 'xstate';
import * as z from 'zod';

interface SearchTrackContext {
    searchQuery: string;
}

const SearchedTrack = z.object({
    id: z.string(),
    title: z.string(),
});
type SearchedTrack = z.infer<typeof SearchedTrack>;

type UpdateSearchQueryEvent = {
    type: 'UPDATE_SEARCH_QUERY';
    searchQuery: string;
};

type SearchTrackEvent =
    | UpdateSearchQueryEvent
    | {
          type: 'SEND_REQUEST';
      }
    | { type: 'FETCHED_TRACKS'; tracks: SearchedTrack[] }
    | { type: 'FAILED_FETCHING_TRACKS' };

interface FetchTracksArgs {
    searchQuery: string;
    tracks?: SearchedTrack[];
}

const SearchTracksAPIResult = z.object({
    tracks: z.array(SearchedTrack),
});

async function fetchTracks({ searchQuery }: FetchTracksArgs) {
    const response = await fetch(`/tracks/search?q=${searchQuery}`);
    if (response.ok === false) {
        throw new Error('Could not get tracks');
    }

    const { tracks } = SearchTracksAPIResult.parse(await response.json());

    return tracks;
}

export const searchTrackMachine = createMachine<
    SearchTrackContext,
    SearchTrackEvent
>(
    {
        context: {
            searchQuery: '',
        },

        initial: 'editing',

        states: {
            editing: {
                on: {
                    UPDATE_SEARCH_QUERY: {
                        actions: 'assignSearchQueryToContext',
                    },

                    SEND_REQUEST: {
                        target: 'fetchingTracks',
                    },
                },
            },

            fetchingTracks: {
                invoke: {
                    src: 'fetchTracks',
                },

                on: {
                    FETCHED_TRACKS: {
                        actions: 'assignTracksToContext',
                        target: 'fetchedTracks',
                    },

                    FAILED_FETCHING_TRACKS: {
                        target: 'errFetchingTracks',
                    },
                },
            },

            fetchedTracks: {},

            errFetchingTracks: {},
        },
    },
    {
        actions: {
            assignSearchQueryToContext: assign((context, event) => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    return context;
                }

                return {
                    ...context,
                    searchQuery: event.searchQuery,
                };
            }),

            assignTracksToContext: assign((context, event) => {
                if (event.type !== 'FETCHED_TRACKS') {
                    return context;
                }

                return {
                    ...context,
                    tracks: event.tracks,
                };
            }),
        },

        services: {
            fetchTracks:
                ({ searchQuery }, _event) =>
                async (sendBack, _onReceive) => {
                    try {
                        const tracks = await fetchTracks({ searchQuery });

                        sendBack({
                            type: 'FETCHED_TRACKS',
                            tracks,
                        });
                    } catch (err) {
                        sendBack({
                            type: 'FAILED_FETCHING_TRACKS',
                        });
                    }
                },
        },
    },
);
