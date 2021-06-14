import urlcat from 'urlcat';
import { assign, createMachine } from 'xstate';
import * as z from 'zod';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

const SearchedTrack = z.object({
    id: z.string(),
    title: z.string(),
});
export type SearchedTrack = z.infer<typeof SearchedTrack>;

interface FetchTracksArgs {
    searchQuery: string;
    tracks?: SearchedTrack[];
}

export const SearchTracksAPIRawResponse = z.object({
    videos: z.array(
        z
            .object({
                id: z
                    .object({
                        videoId: z.string(),
                    })
                    .nonstrict(),
                snippet: z
                    .object({
                        title: z.string(),
                    })
                    .nonstrict(),
            })
            .nonstrict(),
    ),
});
export type SearchTracksAPIRawResponse = z.infer<
    typeof SearchTracksAPIRawResponse
>;

async function fetchTracks({
    searchQuery,
}: FetchTracksArgs): Promise<SearchedTrack[]> {
    const url = urlcat(SERVER_ENDPOINT, '/search/track/:searchQuery', {
        searchQuery,
    });
    const response = await fetch(url);
    if (response.ok === false) {
        throw new Error('Could not get tracks');
    }

    const { videos } = SearchTracksAPIRawResponse.parse(await response.json());

    return videos.map(({ id: { videoId: id }, snippet: { title } }) => ({
        id,
        title,
    }));
}

interface SearchTrackContext {
    tracks: undefined | SearchedTrack[];
}

type SearchTrackEvent =
    | { type: 'FETCHED_TRACKS'; tracks: SearchedTrack[] }
    | { type: 'FAILED_FETCHING_TRACKS' }
    | { type: 'SUBMITTED'; searchQuery: string };

export const searchTrackMachine = createMachine<
    SearchTrackContext,
    SearchTrackEvent
>(
    {
        context: {
            tracks: undefined,
        },

        initial: 'idle',

        invoke: {
            id: 'searchBarMachine',
            src: appScreenHeaderWithSearchBarMachine,
        },

        states: {
            idle: {
                on: {
                    SUBMITTED: {
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

            fetchedTracks: {
                entry: ['navigateToResultsPage'],
            },

            errFetchingTracks: {},
        },
    },
    {
        actions: {
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
            fetchTracks: (_context, event) => async (sendBack, _onReceive) => {
                if (event.type !== 'SUBMITTED') {
                    return;
                }

                const { searchQuery } = event;

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
