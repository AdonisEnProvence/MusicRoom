import Env from '@ioc:Adonis/Core/Env';
import { CreateWorkflowResponse } from '@musicroom/types';
import { ZodCreateWorkflow } from '@musicroom/types/src';
import got from 'got';

export default class ServerToTemporalController {
    public static async createWorflow(
        workflowID: string,
        name: string,
    ): Promise<CreateWorkflowResponse> {
        try {
            return ZodCreateWorkflow.parse(
                await got
                    .put(
                        `${Env.get('TEMPORAL_ENDPOINT')}/create/${workflowID}`,
                        {
                            json: {
                                name,
                            },
                            responseType: 'json',
                        },
                    )
                    .json(),
            );
        } catch (e) {
            throw new Error('Failed to create temporal workflow ' + workflowID);
        }
    }

    public static async joinWorkflow(
        workflowID: string,
        runID: string,
        userID: string,
    ): Promise<void> {
        try {
            await got.put(
                `${Env.get('TEMPORAL_ENDPOINT')}/join/${workflowID}/${runID}`,
                {
                    json: {
                        userID,
                    },
                    responseType: 'json',
                },
            );
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
            await got.put(
                `${Env.get(
                    'TEMPORAL_ENDPOINT',
                )}/control/${workflowID}/${runID}/pause`,
                {
                    json: {
                        userID,
                    },
                    responseType: 'json',
                },
            );
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
            await got.put(
                `${Env.get(
                    'TEMPORAL_ENDPOINT',
                )}/control/${workflowID}/${runID}/play`,
                {
                    json: {
                        userID,
                    },
                    responseType: 'json',
                },
            );
        } catch (e) {
            throw new Error('PLAY FAILED ' + workflowID);
        }
    }
}
