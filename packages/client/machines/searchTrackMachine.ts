import { assign, createMachine } from 'xstate';
import * as z from 'zod';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

const SearchedTrack = z.object({
    id: z.string(),
    title: z.string(),
});
export type SearchedTrack = z.infer<typeof SearchedTrack>;

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

async function fetchTracks({
    searchQuery,
}: FetchTracksArgs): Promise<SearchedTrack[]> {
    const url = `${SERVER_ENDPOINT}/search/track/${encodeURIComponent(
        searchQuery,
    )}`;
    const response = await fetch(url);
    if (response.ok === false) {
        console.error(response.status, response.statusText);
        throw new Error('Could not get tracks');
    }
    const parsedResponse = {
        tracks: (await response.json()).videos.map((el: any) => ({
            id: el.id.videoId,
            title: el.snippet.title,
        })),
    };
    console.log(parsedResponse);
    const { tracks } = SearchTracksAPIResult.parse(parsedResponse);
    return tracks;
}

interface SearchTrackContext {
    searchQuery: string;
    tracks: undefined | SearchedTrack[];
}

export const searchTrackMachine = createMachine<
    SearchTrackContext,
    SearchTrackEvent
>(
    {
        context: {
            searchQuery: '',
            tracks: undefined,
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
        //sync state machine dedicated
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

        //async side effect
        services: {
            fetchTracks:
                ({ searchQuery }, _event) =>
                async (sendBack, _onReceive) => {
                    try {
                        const tracks = await fetchTracks({ searchQuery });
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
