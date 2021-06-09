import Env from '@ioc:Adonis/Core/Env';
import { CreateWorkflowResponse } from '@musicroom/types';
import got from 'got';
import urlcat from 'urlcat';

const TEMPORAL_ENDPOINT = Env.get('TEMPORAL_ENDPOINT');

export default class ServerToTemporalController {
    public static async createWorflow(
        workflowID: string,
        name: string,
        userID: string,
    ): Promise<CreateWorkflowResponse> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/create/:workflowID', {
            workflowID,
        });
        return CreateWorkflowResponse.parse(
            await got
                .put(url, {
                    json: {
                        name,
                        userID,
                    },
                    responseType: 'json',
                })
                .json(),
        );
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
            throw new Error('Failed to create temporal workflow ' + workflowID);
        }
    }

    public static async pause(
        workflowID: string,
        runID: string,
        userID: string,
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
                json: {
                    userID,
                },
                responseType: 'json',
            });
        } catch (e) {
            throw new Error('PAUSE FAILED ' + workflowID);
        }
    }

    public static async play(
        workflowID: string,
        runID: string,
        userID: string,
    ): Promise<void> {
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
                json: {
                    userID,
                },
                responseType: 'json',
            });
        } catch (e) {
            throw new Error('PLAY FAILED ' + workflowID);
        }
    }
}
