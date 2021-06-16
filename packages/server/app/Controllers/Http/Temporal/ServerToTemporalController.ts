import Env from '@ioc:Adonis/Core/Env';
import {
    AppMusicPlayerMachineContext,
    CreateWorkflowResponse,
} from '@musicroom/types';
import got from 'got';
import urlcat from 'urlcat';

const TEMPORAL_ENDPOINT = Env.get('TEMPORAL_ENDPOINT');

interface TemporalCreateMtvWorkflowArgs {
    workflowID: string;
    roomName: string;
    userID: string;
    initialTracksIDs: string[];
}

interface TemporalCreateMtvWorkflowBody {
    roomName: string;
    userID: string;
    initialTracksIDs: string[];
}

export default class ServerToTemporalController {
    public static async createMtvWorflow({
        workflowID,
        roomName,
        userID,
        initialTracksIDs,
    }: TemporalCreateMtvWorkflowArgs): Promise<CreateWorkflowResponse> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/create/:workflowID', {
            workflowID,
        });
        const requestBody: TemporalCreateMtvWorkflowBody = {
            roomName,
            userID,
            initialTracksIDs,
        };

        return CreateWorkflowResponse.parse(
            await got
                .put(url, {
                    json: requestBody,
                    responseType: 'json',
                })
                .json(),
        );
    }

    public static async terminateWorkflow(
        workflowID: string,
        runID: string,
    ): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/terminate/:workflowID/:runID', {
            workflowID,
            runID,
        });
        await got.get(url);
    }

    public static async joinWorkflow(
        workflowID: string,
        runID: string,
        userID: string,
    ): Promise<void> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/join/:workflowID/:runID', {
                workflowID,
                runID,
            });
            await got.put(url, {
                json: {
                    userID,
                },
                responseType: 'json',
            });
        } catch (e) {
            console.error(e);
            throw new Error('Failed to join temporal workflow ' + workflowID);
        }
    }

    public static async pause(
        workflowID: string,
        runID: string,
    ): Promise<void> {
        try {
            const url = urlcat(
                TEMPORAL_ENDPOINT,
                '/control/:workflowID/:runID/pause',
                {
                    workflowID,
                    runID,
                },
            );
            await got.put(url, {
                responseType: 'json',
            });
        } catch (e) {
            throw new Error('PAUSE FAILED ' + workflowID);
        }
    }

    public static async play(workflowID: string, runID: string): Promise<void> {
        try {
            const url = urlcat(
                TEMPORAL_ENDPOINT,
                '/control/:workflowID/:runID/play',
                {
                    workflowID,
                    runID,
                },
            );
            await got.put(url, {
                responseType: 'json',
            });
        } catch (e) {
            throw new Error('PLAY FAILED ' + workflowID);
        }
    }

    //TODO to be dev in temporal atm only mocked in tests
    public static async getState(
        workflowID: string,
        runID: string,
    ): Promise<AppMusicPlayerMachineContext> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/state/:workflowID/:runID', {
                workflowID,
                runID,
            });
            return AppMusicPlayerMachineContext.parse(
                await got.get(url, {
                    responseType: 'json',
                }),
            );
        } catch (e) {
            throw new Error('Get State FAILED' + workflowID);
        }
    }
}
