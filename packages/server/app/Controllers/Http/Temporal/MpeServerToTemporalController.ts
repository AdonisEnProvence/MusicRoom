import Env from '@ioc:Adonis/Core/Env';
import {
    MpeCreateWorkflowResponse,
    MpeRoomClientToServerCreateArgs,
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
}
