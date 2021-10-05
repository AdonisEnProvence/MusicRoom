import Env from '@ioc:Adonis/Core/Env';
import {
    CreateWorkflowResponse,
    LatlngCoords,
    MtvRoomClientToServerCreateArgs,
    MtvRoomPhysicalAndTimeConstraints,
    MtvRoomUpdateControlAndDelegationPermissionArgs,
    MtvRoomUpdateDelegationOwnerArgs,
    MtvWorkflowState,
    TemporalGetStateQueryResponse,
} from '@musicroom/types';
import got from 'got';
import urlcat from 'urlcat';

const TEMPORAL_ENDPOINT = Env.get('TEMPORAL_ENDPOINT');

interface TemporalCreateMtvWorkflowBody
    extends MtvRoomClientToServerCreateArgsWithCoords {
    workflowID: string;
    userID: string;
    deviceID: string;
}

export interface MtvRoomPhysicalAndTimeConstraintsWithCoords
    extends Omit<
        MtvRoomPhysicalAndTimeConstraints,
        'physicalConstraintPlaceID'
    > {
    physicalConstraintPosition: LatlngCoords;
}

interface MtvRoomClientToServerCreateArgsWithCoords
    extends Omit<
        MtvRoomClientToServerCreateArgs,
        'physicalAndTimeConstraints'
    > {
    physicalAndTimeConstraints?: MtvRoomPhysicalAndTimeConstraintsWithCoords;
}

interface TemporalCreateMtvWorkflowArgs {
    workflowID: string;
    userID: string;
    deviceID: string;
    params: MtvRoomClientToServerCreateArgsWithCoords;
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

interface TemporalMtvLeaveWorkflowArgs extends TemporalBaseArgs {
    userID: string;
}

interface TemporalMtvGoToNextTrackArgs extends TemporalBaseArgs {}
interface TemporalMtvPauseArgs extends TemporalBaseArgs {}
interface TemporalMtvPlayArgs extends TemporalBaseArgs {}
interface TemporalMtvTerminateWorkflowArgs extends TemporalBaseArgs {}

interface TemporalMtvSuggestTracksArgs extends TemporalBaseArgs {
    tracksToSuggest: string[];
    userID: string;
    deviceID: string;
}

interface TemporalMtvVoteForTrackArgs extends TemporalBaseArgs {
    userID: string;
    trackID: string;
}

interface TemporalMtvUpdateDelegationOwner
    extends TemporalBaseArgs,
        MtvRoomUpdateDelegationOwnerArgs {
    emitterUserID: string;
}

interface TemporalMtvUpdateControlAndDelegationPermission
    extends TemporalBaseArgs,
        MtvRoomUpdateControlAndDelegationPermissionArgs {}

interface TemporalMtvUpdateUserFitsPositionConstraints
    extends TemporalBaseArgs {
    userFitsPositionConstraint: boolean;
    userID: string;
}

interface TemporalMtvGetStateArgs extends TemporalBaseArgs {
    userID?: string;
}

export default class ServerToTemporalController {
    public static async createMtvWorkflow({
        workflowID,
        userID,
        deviceID,
        params,
    }: TemporalCreateMtvWorkflowArgs): Promise<CreateWorkflowResponse> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/create');
        const body: TemporalCreateMtvWorkflowBody = {
            workflowID,
            userID,
            deviceID,
            ...params,
        };

        return CreateWorkflowResponse.parse(
            await got
                .put(url, {
                    json: body,
                })
                .json(),
        );
    }

    public static async terminateWorkflow({
        workflowID,
        runID,
    }: TemporalMtvTerminateWorkflowArgs): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/terminate');

        await got.put(url, {
            json: {
                workflowID,
                runID,
            },
        });
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

    public static async leaveWorkflow({
        workflowID,
        runID,
        userID,
    }: TemporalMtvLeaveWorkflowArgs): Promise<void> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/leave');
            await got.put(url, {
                json: {
                    userID,
                    runID,
                    workflowID,
                },
                responseType: 'json',
            });
        } catch (e) {
            console.error(e);
            throw new Error('Failed to leave temporal workflow ' + workflowID);
        }
    }

    public static async pause({
        workflowID,
        runID,
    }: TemporalMtvPauseArgs): Promise<void> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/pause');

            await got.put(url, {
                json: {
                    workflowID,
                    runID,
                },
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
            const url = urlcat(TEMPORAL_ENDPOINT, '/play');

            await got.put(url, {
                json: {
                    workflowID,
                    runID,
                },
            });
        } catch (e) {
            throw new Error('PLAY FAILED ' + workflowID);
        }
    }

    public static async getState({
        workflowID,
        runID,
        userID,
    }: TemporalMtvGetStateArgs): Promise<MtvWorkflowState> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/state');

            const res = await got
                .put(url, {
                    json: {
                        workflowID,
                        runID,
                        userID,
                    },
                })
                .json();

            return MtvWorkflowState.parse(res);
        } catch (e) {
            console.error(e);
            throw new Error('Get State FAILED' + workflowID);
        }
    }

    public static async getUsersList({
        workflowID,
        runID,
    }: TemporalMtvGetStateArgs): Promise<TemporalGetStateQueryResponse> {
        try {
            const url = urlcat(TEMPORAL_ENDPOINT, '/users-list');

            const res = await got
                .put(url, {
                    json: {
                        workflowID,
                        runID,
                    },
                })
                .json();

            return TemporalGetStateQueryResponse.parse(res);
        } catch (e) {
            console.error(e);
            throw new Error('Get Users list FAILED' + workflowID);
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

    public static async changeUserEmittingDevice({
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

    public static async suggestTracks({
        workflowID,
        runID,
        tracksToSuggest,
        userID,
        deviceID,
    }: TemporalMtvSuggestTracksArgs): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/suggest-tracks');

        await got.put(url, {
            json: {
                workflowID,
                runID,
                tracksToSuggest,
                userID,
                deviceID,
            },
        });
    }

    public static async voteForTrack({
        workflowID,
        runID,
        trackID,
        userID,
    }: TemporalMtvVoteForTrackArgs): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/vote-for-track');

        await got.put(url, {
            json: {
                workflowID,
                runID,
                trackID,
                userID,
            },
        });
    }

    public static async updateDelegationOwner({
        workflowID,
        runID,
        newDelegationOwnerUserID,
        emitterUserID,
    }: TemporalMtvUpdateDelegationOwner): Promise<void> {
        const url = urlcat(TEMPORAL_ENDPOINT, '/update-delegation-owner');

        await got.put(url, {
            json: {
                workflowID,
                runID,
                newDelegationOwnerUserID,
                emitterUserID,
            },
        });
    }

    public static async updateControlAndDelegationPermission({
        workflowID,
        runID,
        toUpdateUserID,
        hasControlAndDelegationPermission,
    }: TemporalMtvUpdateControlAndDelegationPermission): Promise<void> {
        const url = urlcat(
            TEMPORAL_ENDPOINT,
            '/update-control-and-delegation-permission',
        );

        await got.put(url, {
            json: {
                workflowID,
                runID,
                toUpdateUserID,
                hasControlAndDelegationPermission,
            },
        });
    }

    public static async updateUserFitsPositionConstraints({
        workflowID,
        runID,
        userID,
        userFitsPositionConstraint,
    }: TemporalMtvUpdateUserFitsPositionConstraints): Promise<void> {
        const url = urlcat(
            TEMPORAL_ENDPOINT,
            '/update-user-fits-position-constraint',
        );

        await got.put(url, {
            json: {
                workflowID,
                runID,
                userID,
                userFitsPositionConstraint,
            },
        });
    }
}
