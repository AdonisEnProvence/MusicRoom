import { rest } from 'msw';

import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../machines/searchTrackMachine';
import { db } from '../data';

export const handlers = [
    rest.get<undefined, SearchTracksAPIRawResponse, { query: string }>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        (req, res, ctx) => {
            const { query } = req.params;

            const tracks = db.tracks.findMany({
                where: {
                    title: {
                        contains: query,
                    },
                },
            });

            return res(
                ctx.json({
                    videos: tracks.map(({ id, title }) => ({
                        id: { videoId: id },
                        snippet: { title },
                    })),
                }),
            );
        },
    ),
];
