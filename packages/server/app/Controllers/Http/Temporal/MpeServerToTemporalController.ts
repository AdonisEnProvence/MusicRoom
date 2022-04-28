import Env from '@ioc:Adonis/Core/Env';
import {
    MpeCreateWorkflowResponse,
    MpeRoomClientToServerCreateArgs,
    MpeAddTracksRequestBody,
    MpeAddTracksResponseBody,
    MpeChangeTrackOrderResponseBody,
    MpeChangeTrackOrderRequestBody,
    MpeDeleteTracksRequestBody,
    MpeDeleteTracksResponseBody,
    MpeGetStateQueryRequestBody,
    MpeGetStateQueryResponseBody,
    MpeJoinResponseBody,
    MpeJoinRequestBody,
    MpeLeaveWorkflowRequestBody,
    MpeLeaveWorkflowResponseBody,
    MpeTerminateWorkflowRequestBody,
    MpeTerminateWorkflowResponseBody,
    MpeExportToMtvResponseBody,
    MpeExportToMtvRequestBody,
} from '@musicroom/types';
import urlcat from 'urlcat';
import { adonisToTemporalRequester } from './AdonisTemporalRequester';

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
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async joinWorkflow(
        body: MpeJoinRequestBody,
    ): Promise<MpeJoinResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/join');

        return MpeJoinResponseBody.parse(
            await adonisToTemporalRequester
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
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async changeTrackOrder(
        body: MpeChangeTrackOrderRequestBody,
    ): Promise<MpeChangeTrackOrderResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/change-track-order');

        return MpeChangeTrackOrderResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async deleteTracks(
        body: MpeDeleteTracksRequestBody,
    ): Promise<MpeDeleteTracksResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/delete-tracks');

        return MpeDeleteTracksResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async getStateQuery(
        body: MpeGetStateQueryRequestBody,
    ): Promise<MpeGetStateQueryResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/get-state');

        return MpeGetStateQueryResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async exportToMtv(
        body: MpeExportToMtvRequestBody,
    ): Promise<MpeExportToMtvResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/export-to-mtv');

        return MpeExportToMtvResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async leaveWorkflow(
        body: MpeLeaveWorkflowRequestBody,
    ): Promise<MpeLeaveWorkflowResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/leave');

        return MpeLeaveWorkflowResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async terminateWorkflow(
        body: MpeTerminateWorkflowRequestBody,
    ): Promise<MpeTerminateWorkflowResponseBody> {
        const url = urlcat(MPE_TEMPORAL_ENDPOINT, '/terminate');

        return MpeTerminateWorkflowResponseBody.parse(
            await adonisToTemporalRequester
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }
}
