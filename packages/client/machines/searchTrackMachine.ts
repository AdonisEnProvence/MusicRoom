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
