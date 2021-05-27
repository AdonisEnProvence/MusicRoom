import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { google, youtube_v3 } from 'googleapis';
import Env from '@ioc:Adonis/Core/Env';

const youtube = google.youtube({
    version: 'v3',
    auth: Env.get('GOOGLE_API_KEY'),
});

async function searchTrackName({
    request,
    response,
}: HttpContextContract): Promise<
    { videos: youtube_v3.Schema$SearchResult[] | undefined } | undefined
> {
    console.log(request, response);
    const params = request.params();
    console.log(params);
    if (params.query !== undefined) {
        try {
            const res = (
                await youtube.search.list({
                    q: params.query,
                    part: ['id', 'snippet'],
                    regionCode: 'FR',
                    videoCategoryId: '10',
                    safeSearch: 'moderate',
                    type: ['video'],
                    videoCaption: 'any',
                    videoDuration: 'short', //less than 4 minutes
                })
            ).data;
            return { videos: res.items };
        } catch (e) {
            console.error(e);
            response.status(500);
        }
    } else {
        response.status(400);
        response.send('missing query parameter');
    }
}

export const TracksSearchController = {
    searchTrackName,
};
