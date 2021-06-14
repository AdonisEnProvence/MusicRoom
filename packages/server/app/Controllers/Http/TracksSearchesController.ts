import Env from '@ioc:Adonis/Core/Env';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { google, youtube_v3 } from 'googleapis';

const youtube = google.youtube({
    version: 'v3',
    auth: Env.get('GOOGLE_API_KEY'),
});

export default class TracksSearchesController {
    public async searchTrackName({ request }: HttpContextContract): Promise<{
        videos: youtube_v3.Schema$SearchResult[] | undefined;
    }> {
        const params = request.params();
        const query = decodeURIComponent(params.query);

        const {
            data: { items: videos },
        } = await youtube.search.list({
            q: query,
            part: ['id', 'snippet'],
            regionCode: 'FR',
            videoCategoryId: '10',
            safeSearch: 'moderate',
            type: ['video'],
            videoCaption: 'any',
            videoDuration: 'short', //less than 4 minutes
        });

        return { videos };
    }
}
