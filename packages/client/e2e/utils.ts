import { TrackMetadata } from '@musicroom/types';
import { BrowserContext, expect, Page } from '@playwright/test';

export interface KnownSearchesElement {
    id: string;
    title: string;
    artistName: string;
    duration: number;
}

export type KnownSearchesRecord = Record<string, KnownSearchesElement[]>;

export function assertIsNotUndefined<ValueType>(
    value: ValueType | undefined,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error('value must not be undefined');
    }
}

export function assertIsNotNull<ValueType>(
    value: ValueType | null,
    label?: string,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error(label ?? 'value must not be null');
    }
}

interface assertMusicPlayerStatusIs {
    page: Page;
    testID: `music-player-${'playing' | 'not-playing'}-device-${
        | 'emitting'
        | 'muted'}`;
}

export async function assertMusicPlayerStatusIs({
    page,
    testID,
}: assertMusicPlayerStatusIs): Promise<void> {
    //Waiting for timeout as the following assertion can bring some race condition
    await new Promise((r) => setTimeout(r, 100));

    await expect(
        page.locator(`css=[data-testid="${testID}"] >> visible=true`),
    ).toBeVisible();
}

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
            console.log('request', request.url(), request.method());
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
