import {
    MtvRoomSearchRequestBody,
    MtvRoomSearchResponse,
    PlaceAutocompleteResponse,
    TrackMetadata,
} from '@musicroom/types';
import { datatype } from 'faker';
import { rest } from 'msw';
import { SERVER_ENDPOINT } from '../../constants/Endpoints';
import { SearchTracksAPIRawResponse } from '../../services/search-tracks';
import { db } from '../data';

export const handlers = [
    rest.get<undefined, SearchTracksAPIRawResponse, { query: string }>(
        `${SERVER_ENDPOINT}/search/track/:query`,
        (req, res, ctx) => {
            const { query } = req.params;

            const tracks = db.searchableTracks.findMany({
                where: {
                    title: {
                        contains: decodeURIComponent(query),
                    },
                },
            });

            return res(ctx.json(tracks as TrackMetadata[] | undefined));
        },
    ),

    rest.get<undefined, PlaceAutocompleteResponse, { input: string }>(
        `${SERVER_ENDPOINT}/proxy-places-api/*`,
        (req, res, ctx) => {
            const placeQueryEncoded = req.url.searchParams.get('input');
            if (placeQueryEncoded === null) {
                return res(ctx.status(500));
            }
            const placeQuery = decodeURIComponent(placeQueryEncoded);

            const response: PlaceAutocompleteResponse = {
                status: 'OK',
                predictions: [
                    {
                        description: placeQuery,
                        matched_substrings: [],
                        place_id: datatype.uuid(),
                        types: [],
                        structured_formatting: {
                            main_text: '',
                            main_text_matched_substrings: [],
                            secondary_text: '',
                        },
                        terms: [],
                    },
                ],
            };

            return res(ctx.json(response));
        },
    ),

    rest.post<MtvRoomSearchRequestBody, MtvRoomSearchResponse>(
        `${SERVER_ENDPOINT}/search/rooms`,
        (req, res, ctx) => {
            const PAGE_SIZE = 10;
            const { page, searchQuery } = req.body;

            const allRooms = db.searchableRooms.getAll();
            const roomsMatching = allRooms.filter(({ roomName }) =>
                roomName.startsWith(searchQuery),
            );
            const paginatedRooms = roomsMatching.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            );

            return res(
                ctx.json({
                    data: paginatedRooms,
                    totalEntries: roomsMatching.length,
                    hasMore: roomsMatching.length > page * PAGE_SIZE,
                    page,
                }),
            );
        },
    ),
];
