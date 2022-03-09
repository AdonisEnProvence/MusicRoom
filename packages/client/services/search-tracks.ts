import * as z from 'zod';
import { TrackMetadata } from '@musicroom/types';
import { request } from './http';

interface FetchTracksArgs {
    searchQuery: string;
    tracks?: TrackMetadata[];
}

export const SearchTracksAPIRawResponse = TrackMetadata.array().optional();
export type SearchTracksAPIRawResponse = z.infer<
    typeof SearchTracksAPIRawResponse
>;

const SearchTracksCache = new Map<string, TrackMetadata>();

export async function fetchTracksSuggestions({
    searchQuery,
}: FetchTracksArgs): Promise<TrackMetadata[] | undefined> {
    const response = await request.get(
        `/search/track/${encodeURIComponent(searchQuery)}`,
    );

    const tracksMetadata = SearchTracksAPIRawResponse.parse(response.data);
    if (tracksMetadata === undefined) {
        return tracksMetadata;
    }

    for (const trackMetadata of tracksMetadata) {
        SearchTracksCache.set(trackMetadata.id, trackMetadata);
    }

    return tracksMetadata;
}

export async function fetchTrackByID(
    trackID: string,
): Promise<TrackMetadata | undefined> {
    const trackInCache = SearchTracksCache.get(trackID);

    return Promise.resolve(trackInCache);
}

export async function fetchTracksByID(
    trackIDs: string[],
): Promise<TrackMetadata[] | undefined> {
    const tracksMetadata: TrackMetadata[] = [];

    for (const trackID of trackIDs) {
        const trackMetadata = await fetchTrackByID(trackID);
        if (trackMetadata === undefined) {
            continue;
        }

        tracksMetadata.push(trackMetadata);
    }

    return Promise.resolve(tracksMetadata);
}
