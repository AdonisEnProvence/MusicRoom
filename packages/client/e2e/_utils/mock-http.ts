import { TrackMetadata } from '@musicroom/types';
import { BrowserContext } from '@playwright/test';

export interface KnownSearchesElement {
    id: string;
    title: string;
    artistName: string;
    duration: number;
}

export type knownSearchesRecordKey =
    | 'Biolay - Vendredi 12'
    | 'BB Brunes'
    | 'Madeleine';

export type KnownSearchesRecord = Record<
    knownSearchesRecordKey,
    KnownSearchesElement[]
>;

export async function mockSearchTracks({
    context,
    knownSearches,
}: {
    context: BrowserContext;
    knownSearches: Record<string, TrackMetadata[]>;
}): Promise<void> {
    await context.route(
        'http://localhost:3333/search/track/*',
        (route, request) => {
            const requestMethod = request.method();
            if (requestMethod !== 'GET') {
                void route.abort('failed');
                return;
            }

            const urlChunks = request.url().split('/');
            const searchQuery = urlChunks[urlChunks.length - 1];
            const decodedSearchQuery = decodeURIComponent(searchQuery);
            const searchResults = knownSearches[decodedSearchQuery];
            if (searchResults === undefined) {
                void route.abort('failed');
                return;
            }

            void route.fulfill({
                headers: {
                    'access-control-allow-credentials': 'true',
                    'access-control-allow-origin': 'http://localhost:4000',
                },
                contentType: 'application/json; charset=utf-8',
                body: JSON.stringify(searchResults),
            });
        },
    );
}
