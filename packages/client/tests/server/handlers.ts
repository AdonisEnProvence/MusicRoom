import { rest } from 'msw';
import { TrackMetadata } from '@musicroom/types';

import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../machines/searchTrackMachine';
import { db } from '../data';

export const handlers = [
    rest.get<undefined, SearchTracksAPIRawResponse, { query: string }>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        (req, res, ctx) => {
            const { query } = req.params;

            const tracks = db.searchableTracks.findMany({
                where: {
                    title: {
                        contains: query,
                    },
                },
            });

            return res(ctx.json(tracks as TrackMetadata[] | undefined));
        },
    ),
];
