import { Page } from '@playwright/test';

export async function waitForYouTubeVideoToLoad(page: Page): Promise<void> {
    await page.waitForResponse((response) => {
        /**
         * At time of writing (11-01-2021), a request is made by YouTube player to
         * https://r1---sn-a0jpm-a0ms.googlevideo.com/videoplayback when launching a video.
         */
        const isReponseToYouTubeVideoLoading = response
            .url()
            .includes('videoplayback');

        return isReponseToYouTubeVideoLoading === true;
    });
}
