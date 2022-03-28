import Env from '@ioc:Adonis/Core/Env';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { TrackMetadata } from '@musicroom/types';
import { google } from 'googleapis';
import invariant from 'tiny-invariant';

const youtube = google.youtube({
    version: 'v3',
    auth: Env.get('GOOGLE_API_KEY'),
});

//TODO
export default class TracksSearchesController {
    public async searchTrackName({
        request,
        auth,
        bouncer,
    }: HttpContextContract): Promise<TrackMetadata[] | undefined> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to search users',
        );
        await bouncer.authorize('hasConfirmedEmail');

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
            // TODO: do we really want this limit?
            videoDuration: 'short', //less than 4 minutes
        });

        const tracksMetadata: TrackMetadata[] | undefined = videos
            ?.map(({ id, snippet }) => {
                if (id === undefined || snippet === undefined) {
                    return undefined;
                }

                const { videoId } = id;
                const { title, channelTitle, publishedAt } = snippet;

                if (
                    typeof videoId !== 'string' ||
                    typeof title !== 'string' ||
                    typeof channelTitle !== 'string' ||
                    typeof publishedAt !== 'string'
                ) {
                    return undefined;
                }

                const trackMetadata: TrackMetadata = {
                    id: videoId,
                    title,
                    artistName: channelTitle,
                    duration: 0,
                };

                return trackMetadata;
            })
            .filter(TrackMetadata.check.bind(TrackMetadata));

        return tracksMetadata;
    }
}
