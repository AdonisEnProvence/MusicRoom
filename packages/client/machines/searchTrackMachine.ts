import urlcat from 'urlcat';
import { assign, createMachine } from 'xstate';
import * as z from 'zod';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

const SearchedTrack = z.object({
    id: z.string(),
    title: z.string(),
});
export type SearchedTrack = z.infer<typeof SearchedTrack>;

type SearchTrackEvent =
    | {
          type: 'SEND_REQUEST';
          searchQuery: string;
      }
    | { type: 'FETCHED_TRACKS'; tracks: SearchedTrack[] }
    | { type: 'FAILED_FETCHING_TRACKS' };

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

export const searchTrackMachine = createMachine<
    SearchTrackContext,
    SearchTrackEvent
>(
    {
        context: {
            tracks: undefined,
        },

        initial: 'idle',

        states: {
            idle: {
                on: {
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
                if (event.type !== 'SEND_REQUEST') {
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
