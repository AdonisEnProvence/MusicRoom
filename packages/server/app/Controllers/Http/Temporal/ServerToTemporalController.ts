import Env from '@ioc:Adonis/Core/Env';
import { CreateWorkflowResponse, MtvWorkflowState } from '@musicroom/types';
import got from 'got';
import urlcat from 'urlcat';

const TEMPORAL_ENDPOINT = Env.get('TEMPORAL_ENDPOINT');

interface TemporalCreateMtvWorkflowBody {
    roomName: string;
    userID: string;
    deviceID: string;
    initialTracksIDs: string[];
}

interface TemporalCreateMtvWorkflowArgs {
    workflowID: string;
    roomName: string;
    userID: string;
    deviceID: string;
    initialTracksIDs: string[];
}

interface TemporalBaseArgs {
    runID: string;
    workflowID: string;
}

interface TemporalMtvJoinWorklowArgs extends TemporalBaseArgs {
    deviceID: string;
    userID: string;
}

interface TemporalMtvChangeUserEmittingDeviceArgs extends TemporalBaseArgs {
    deviceID: string;
    userID: string;
}

interface TemporalMtvGoToNextTrackArgs extends TemporalBaseArgs {}
interface TemporalMtvPauseArgs extends TemporalBaseArgs {}
interface TemporalMtvPlayArgs extends TemporalBaseArgs {}
interface TemporalMtvGetStateArgs extends TemporalBaseArgs {
    userID?: string;
}
interface TemporalMtvTerminateWorkflowArgs extends TemporalBaseArgs {}

export default class ServerToTemporalController {
    public static async createMtvWorkflow({
        workflowID,
        roomName,
        userID,
        initialTracksIDs,
        deviceID,
    }: TemporalCreateMtvWorkflowArgs): Promise<CreateWorkflowResponse> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/create/:workflowID', {
            workflowID,
        });
        const body: TemporalCreateMtvWorkflowBody = {
            roomName,
            userID,
            initialTracksIDs,
            deviceID,
        };

        return CreateWorkflowResponse.parse(
            await got
                .put(url, {
                    json: body,
                    responseType: 'json',
                })
                .json(),
        );
    }

    public static async terminateWorkflow({
        workflowID,
        runID,
    }: TemporalMtvTerminateWorkflowArgs): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/terminate/:workflowID/:runID', {
            workflowID,
            runID,
        });
        await got.get(url);
    }

    public static async joinWorkflow({
        workflowID,
        runID,
        userID,
        deviceID,
    }: TemporalMtvJoinWorklowArgs): Promise<void> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/join');
            await got.put(url, {
                json: {
                    userID,
                    deviceID,
                    runID,
                    workflowID,
                },
                responseType: 'json',
            });
        } catch (e) {
            console.error(e);
            throw new Error('Failed to join temporal workflow ' + workflowID);
        }
    }

    public static async pause({
        workflowID,
        runID,
    }: TemporalMtvPauseArgs): Promise<void> {
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

    public static async play({
        workflowID,
        runID,
    }: TemporalMtvPlayArgs): Promise<void> {
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
    public static async getState({
        workflowID,
        runID,
        userID,
    }: TemporalMtvGetStateArgs): Promise<MtvWorkflowState> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/state/:workflowID/:runID', {
                workflowID,
                runID,
                userID,
            });

            const res = await got.get(url).json();

            return MtvWorkflowState.parse(res);
        } catch (e) {
            console.error(e);
            throw new Error('Get State FAILED' + workflowID);
        }
    }

    public static async goToNextTrack({
        workflowID,
        runID,
    }: TemporalMtvGoToNextTrackArgs): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/go-to-next-track');

        await got.put(url, {
            json: {
                workflowID,
                runID,
            },
        });
    }

    public static async ChangeUserEmittingDevice({
        deviceID,
        runID,
        userID,
        workflowID,
    }: TemporalMtvChangeUserEmittingDeviceArgs): Promise<void> {
        try {
            const url = urlcat(
                TEMPORAL_ENDPOINT,
                '/change-user-emitting-device',
            );
            await got.put(url, {
                json: {
                    userID,
                    deviceID,
                    runID,
                    workflowID,
                },
                responseType: 'json',
            });
        } catch (e) {
            console.error(e);
            throw new Error(
                'Failed to change user emitting device ' + workflowID,
            );
        }
    }
}
