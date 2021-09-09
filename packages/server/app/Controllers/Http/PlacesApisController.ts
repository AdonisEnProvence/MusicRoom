import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import got from 'got';
import urlcat from 'urlcat';

export default class PlacesApisController {
    public async proxyPlacesAPIRequest({
        request,
    }: HttpContextContract): Promise<unknown> {
        const ROUTE_PATH = '/proxy-places-api';
        const requestPath = request.url(true);
        const pathToProxy = requestPath.replace(ROUTE_PATH, '');
        const urlToFetch = urlcat(
            'https://maps.googleapis.com/maps/api',
            pathToProxy,
        );

        const response = await got.get(urlToFetch).json();

        return response;
    }
}
