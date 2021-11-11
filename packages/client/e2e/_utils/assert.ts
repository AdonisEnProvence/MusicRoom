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
