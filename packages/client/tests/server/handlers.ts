import { rest } from 'msw';
import faker from 'faker';

import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../machines/searchTrackMachine';

export const handlers = [
    rest.get<undefined, SearchTracksAPIRawResponse, { query: string }>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        (req, res, ctx) => {
            const { query } = req.params;

            return res(
                ctx.json({
                    videos: [
                        {
                            id: { videoId: faker.datatype.uuid() },
                            snippet: { title: faker.random.words(3) },
                        },
                    ],
                }),
            );
        },
    ),
];
