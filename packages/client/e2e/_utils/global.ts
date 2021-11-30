import { expect, Page } from '@playwright/test';

export async function hitGoNextButton({ page }: { page: Page }): Promise<void> {
    const goNext = page.locator('text="Next" >> visible=true').last();
    await expect(goNext).toBeVisible();
    await goNext.click();
}
