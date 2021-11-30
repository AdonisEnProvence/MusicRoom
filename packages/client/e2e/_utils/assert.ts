import { expect, Page } from '@playwright/test';

export function assertIsNotUndefined<ValueType>(
    value: ValueType | undefined,
    label?: string,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error(label ?? 'value must not be undefined');
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

interface assertMusicPlayerStatusIsArgs {
    page: Page;
    testID: `music-player-${'playing' | 'not-playing'}-device-${
        | 'emitting'
        | 'muted'}`;
}

/**
 * This method should be called after a waitForYoutubeToLoad to avoid race condition
 */
export async function assertMusicPlayerStatusIs({
    page,
    testID,
}: assertMusicPlayerStatusIsArgs): Promise<void> {
    await expect(page.locator(`css=[data-testid="${testID}"]`)).toBeVisible({
        timeout: 20_000,
    });
}
