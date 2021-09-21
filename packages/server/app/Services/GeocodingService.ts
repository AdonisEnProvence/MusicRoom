import { Client } from '@googlemaps/google-maps-services-js';
import Env from '@ioc:Adonis/Core/Env';
import { LatlngCoords } from '@musicroom/types';

const client = new Client({});

export default class GeocodingService {
    public static async getCoordsFromAddress(
        placeID: string,
    ): Promise<LatlngCoords> {
        const response = await client.geocode({
            params: {
                place_id: placeID,
                key: Env.get('GOOGLE_GEOCODING_API_KEY'),
            },
        });
        const { results } = response.data;
        const resultsAreEmpty = results.length === 0;

        if (resultsAreEmpty) {
            throw new Error('Geocode error empty results');
        }

        return results[0].geometry.location;
    }
}
