import { SignUpResponseBody } from '@musicroom/types';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function sendSignUp(): Promise<SignUpResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(url);
    const parsedResponse = SignUpResponseBody.parse(rawResponse.data);

    return parsedResponse;
}
