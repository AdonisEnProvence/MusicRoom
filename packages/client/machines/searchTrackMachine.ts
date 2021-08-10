import urlcat from 'urlcat';
import { createModel } from 'xstate/lib/model';
import * as z from 'zod';
import { TracksMetadata } from '@musicroom/types';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { appScreenHeaderWithSearchBarMachine } from './appScreenHeaderWithSearchBarMachine';

interface FetchTracksArgs {
    searchQuery: string;
    tracks?: TracksMetadata[];
}

export const SearchTracksAPIRawResponse = TracksMetadata.array().optional();
export type SearchTracksAPIRawResponse = z.infer<
    typeof SearchTracksAPIRawResponse
>;

async function fetchTracks({
    searchQuery,
}: FetchTracksArgs): Promise<TracksMetadata[] | undefined> {
    const url = urlcat(SERVER_ENDPOINT, '/search/track/:searchQuery', {
        searchQuery,
    });
    const response = await fetch(url);
    if (response.ok === false) {
        throw new Error('Could not get tracks');
    }

    const tracksMetadata = SearchTracksAPIRawResponse.parse(
        await response.json(),
    );

    return tracksMetadata;
}

const searchTrackModel = createModel(
    {
        tracks: undefined as TracksMetadata[] | undefined,
    },
    {
        events: {
            FETCHED_TRACKS: (tracks: TracksMetadata[]) => ({ tracks }),
            FAILED_FETCHING_TRACKS: () => ({}),
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
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
        context: searchTrackModel.initialContext,

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
    },
    {
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
