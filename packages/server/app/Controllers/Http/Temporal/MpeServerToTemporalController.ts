import Env from '@ioc:Adonis/Core/Env';
import {
    MpeCreateWorkflowResponse,
    MpeRoomClientToServerCreateArgs,
    MpeAddTracksRequestBody,
    MpeAddTracksResponseBody,
} from '@musicroom/types';
import got from 'got';
import urlcat from 'urlcat';

const MPE_TEMPORAL_ENDPOINT = urlcat(Env.get('TEMPORAL_ENDPOINT'), '/mpe');

interface TemporalCreateMpeWorkflowArgs
    extends MpeRoomClientToServerCreateArgs {
    workflowID: string;
    userID: string;
}

export default class MpeServerToTemporalController {
    public static async createMpeWorkflow(
        body: TemporalCreateMpeWorkflowArgs,
    ): Promise<MpeCreateWorkflowResponse> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/create');

        return MpeCreateWorkflowResponse.parse(
            await got
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async addTracks(
        body: MpeAddTracksRequestBody,
    ): Promise<MpeAddTracksResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/add-tracks');

        return MpeAddTracksResponseBody.parse(
            await got
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }
}
