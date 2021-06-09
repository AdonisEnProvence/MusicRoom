import urlcat from 'urlcat';
import * as z from 'zod';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function listAllRooms(): Promise<string[]> {
    const url = urlcat(SERVER_ENDPOINT, '/search/rooms');
    const response = await fetch(url, { method: 'POST' });
    if (response.ok === false) {
        console.error(response.status, response.statusText);
        throw new Error('Could not get rooms');
    }
    const parsedResponse = z.array(z.string()).parse(await response.json());
    return parsedResponse;
}
