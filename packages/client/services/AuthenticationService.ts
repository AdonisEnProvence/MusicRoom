import {
    SignUpRequestBody,
    SignUpSuccessfullResponseBody,
} from '@musicroom/types';
import redaxios from 'redaxios';
import urlcat from 'urlcat';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

export async function sendSignUp(
    body: SignUpRequestBody,
): Promise<SignUpSuccessfullResponseBody> {
    const url = urlcat(SERVER_ENDPOINT, '/authentication/sign-up');

    const rawResponse = await redaxios.post(url, body);
    //readaxios will throw an error how http code 400 catch
    const parsedResponse = SignUpSuccessfullResponseBody.parse(
        rawResponse.data,
    );

    return parsedResponse;
}
