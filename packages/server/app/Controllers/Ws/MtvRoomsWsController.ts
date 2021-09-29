import {
    CreateWorkflowResponse,
    MtvRoomClientToServerCreateArgs,
    MtvRoomUpdateControlAndDelegationPermissionArgs,
    MtvRoomUpdateDelegationOwnerArgs,
    MtvRoomUsersListElement,
    MtvWorkflowState,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import GeocodingService from 'App/Services/GeocodingService';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { randomUUID } from 'crypto';
import { isPointWithinRadius } from 'geolib';
import ServerToTemporalController, {
    MtvRoomPhysicalAndTimeConstraintsWithCoords,
} from '../Http/Temporal/ServerToTemporalController';

interface UserID {
    userID: string;
}

interface UserArgs {
    user: User;
}

interface RoomID {
    roomID: string;
}

interface DeviceID {
    deviceID: string;
}

interface RunID {
    runID: string;
}

interface OnCreateArgs extends UserID, DeviceID {
    params: MtvRoomClientToServerCreateArgs;
}
interface OnJoinArgs extends UserID, DeviceID {
    joiningRoom: MtvRoom;
}
interface OnLeaveArgs extends UserArgs {
    leavingRoomID: string;
}
interface OnPauseArgs extends RoomID {}
interface OnPlayArgs extends RoomID {}
interface OnTerminateArgs extends RoomID, RunID {}
interface OnGetStateArgs extends RoomID, UserID {}
interface OnGetUsersListArgs {
    roomID: string;
}
interface OnGoToNextTrackArgs extends RoomID {}
interface OnChangeEmittingDeviceArgs extends RoomID, DeviceID, UserID {}
interface OnSuggestTracksArgs extends RoomID, DeviceID, UserID {
    tracksToSuggest: string[];
}

interface OnUpdateDelegationOwner extends MtvRoomUpdateDelegationOwnerArgs {
    emitterUserID: string;
    roomID: string;
}

interface OnUpdateControlAndDelegationPermissionArgs
    extends MtvRoomUpdateControlAndDelegationPermissionArgs {
    roomID: string;
}

interface OnVoteForTrackArgs extends RoomID, UserID {
    trackID: string;
}

export default class MtvRoomsWsController {
    public static async onCreate({
        params,
        userID,
        deviceID,
    }: OnCreateArgs): Promise<CreateWorkflowResponse> {
        let physicalAndTimeConstraintsWithCoords:
            | MtvRoomPhysicalAndTimeConstraintsWithCoords
            | undefined;

        if (
            params.hasPhysicalAndTimeConstraints &&
            params.physicalAndTimeConstraints !== undefined
        ) {
            const coords = await GeocodingService.getCoordsFromAddress(
                params.physicalAndTimeConstraints.physicalConstraintPlaceID,
            );
            physicalAndTimeConstraintsWithCoords = {
                ...params.physicalAndTimeConstraints,
                physicalConstraintPosition: coords,
            };
        }

        const roomID = randomUUID();
        const room = new MtvRoom();
        let roomHasBeenSaved = false;
        console.log(`USER ${userID} CREATE_ROOM ${roomID}`);

        /**
         * We need to create the room before the workflow
         * because we don't know if temporal will answer faster
         * than adonis will execute this function
         */
        const roomCreator = await User.findOrFail(userID);
        await UserService.joinEveryUserDevicesToRoom(roomCreator, roomID);

        try {
            const temporalResponse =
                await ServerToTemporalController.createMtvWorkflow({
                    workflowID: roomID,
                    userID: userID,
                    deviceID,
                    params: {
                        ...params,
                        physicalAndTimeConstraints:
                            physicalAndTimeConstraintsWithCoords,
                    },
                });

            room.merge({
                uuid: roomID,
                runID: temporalResponse.runID,
                name: params.name,
                creatorID: userID,
                isOpen: params.isOpen,
            });

            if (
                params.hasPhysicalAndTimeConstraints &&
                params.physicalAndTimeConstraints !== undefined &&
                physicalAndTimeConstraintsWithCoords
            ) {
                room.merge({
                    hasPositionAndTimeConstraints:
                        params.hasPhysicalAndTimeConstraints,
                    constraintRadius:
                        physicalAndTimeConstraintsWithCoords.physicalConstraintRadius,
                    constraintLat:
                        physicalAndTimeConstraintsWithCoords
                            .physicalConstraintPosition.lat,
                    constraintLng:
                        physicalAndTimeConstraintsWithCoords
                            .physicalConstraintPosition.lng,
                });
            }
            await room.save();
            roomHasBeenSaved = true;

            await roomCreator.merge({ mtvRoomID: roomID }).save();
            await room.related('members').save(roomCreator);
            console.log('created room ' + roomID);

            return temporalResponse;
        } catch (error) {
            await SocketLifecycle.deleteSocketIoRoom(roomID);
            if (roomHasBeenSaved) await room.delete();

            throw error;
        }
    }

    public static async onJoin({
        userID,
        joiningRoom: { runID, uuid: roomID },
        deviceID,
    }: OnJoinArgs): Promise<void> {
        console.log(`USER ${userID} JOINS ${roomID}`);

        await ServerToTemporalController.joinWorkflow({
            workflowID: roomID,
            runID: runID,
            userID,
            deviceID,
        });
    }

    public static async onLeave({
        user,
        leavingRoomID,
    }: OnLeaveArgs): Promise<void> {
        const { uuid: userID } = user;
        console.log(`USER ${userID} LEAVES ${leavingRoomID}`);

        const leavingRoom = await MtvRoom.findOrFail(leavingRoomID);
        const { creatorID, runID } = leavingRoom;

        /**
         * No matter if the leaving user was creator or not
         * We need to disconnect every of his device from the room socket io instance
         * And to dissociate his relationship with the mtvRoom
         */
        await UserService.leaveEveryUserDevicesFromRoom(user, leavingRoomID);
        await user.related('mtvRoom').dissociate();

        /**
         * If the leaving user is the room creator we need
         * to terminate the workflow and forced disconnect
         * every remaining users
         */
        const leavingUserIsTheCreator = userID === creatorID;
        console.log('LEAVING USER IS THE CREATOR ', leavingUserIsTheCreator);
        if (leavingUserIsTheCreator) {
            await SocketLifecycle.ownerLeavesRoom(leavingRoom);
        } else {
            await ServerToTemporalController.leaveWorkflow({
                workflowID: leavingRoomID,
                runID: runID,
                userID,
            });
        }
    }

    public static async onPause({ roomID }: OnPauseArgs): Promise<void> {
        console.log(`PAUSE ${roomID}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.pause({ workflowID: roomID, runID });
    }

    public static async onPlay({ roomID }: OnPlayArgs): Promise<void> {
        console.log(`PLAY ${roomID} `);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.play({ workflowID: roomID, runID });
    }

    /**
     * In this function we do three operations that can fail for an infinite number of reasons.
     * The problem is that they are all necessary to keep consistence of our data.
     * Using a Temporal Workflow would ease dealing with failure.
     *
     * See https://github.com/AdonisEnProvence/MusicRoom/issues/49
     */
    public static async onTerminate({
        roomID,
        runID,
    }: OnTerminateArgs): Promise<void> {
        console.log(`TERMINATE ${roomID}`);
        await ServerToTemporalController.terminateWorkflow({
            workflowID: roomID,
            runID: runID,
        });
    }

    public static async onGetState({
        roomID,
        userID,
    }: OnGetStateArgs): Promise<MtvWorkflowState> {
        const room = await MtvRoom.findOrFail(roomID);
        return await ServerToTemporalController.getState({
            workflowID: roomID,
            runID: room.runID,
            userID,
        });
    }

    public static async onGetUsersList({
        roomID,
    }: OnGetUsersListArgs): Promise<MtvRoomUsersListElement[]> {
        const room = await MtvRoom.findOrFail(roomID);
        const temporalFormatedUsersList =
            await ServerToTemporalController.getUsersList({
                workflowID: roomID,
                runID: room.runID,
            });

        await room.load('members');
        const usersRelatedToRoom = room.members;
        const formattedUsersList: MtvRoomUsersListElement[] =
            temporalFormatedUsersList.map((temporalUser) => {
                const pgUser = usersRelatedToRoom.find(
                    (user) => temporalUser.userID === user.uuid,
                );

                if (pgUser === undefined) {
                    throw new Error(
                        'Postgres and temporal are desync on users list',
                    );
                }
                return {
                    ...temporalUser,
                    nickname: pgUser.nickname,
                    avatar: undefined,
                };
            });

        if (formattedUsersList.length === 0) {
            throw new Error('FormattedUsersList is empty');
        }

        return formattedUsersList;
    }

    public static async onGoToNextTrack({
        roomID,
    }: OnGoToNextTrackArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.goToNextTrack({
            workflowID: roomID,
            runID,
        });
    }

    public static async onChangeEmittingDevice({
        deviceID,
        roomID,
        userID,
    }: OnChangeEmittingDeviceArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.changeUserEmittingDevice({
            workflowID: roomID,
            runID,
            deviceID,
            userID,
        });
    }

    public static async onTracksSuggestion({
        roomID,
        tracksToSuggest,
        userID,
        deviceID,
    }: OnSuggestTracksArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.suggestTracks({
            workflowID: roomID,
            runID,
            tracksToSuggest,
            userID,
            deviceID,
        });
    }

    public static async voteForTrack({
        roomID,
        trackID,
        userID,
    }: OnVoteForTrackArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.voteForTrack({
            workflowID: roomID,
            runID,
            trackID,
            userID,
        });
    }

    public static async updateDelegationOwner({
        emitterUserID,
        newDelegationOwnerUserID,
        roomID,
    }: OnUpdateDelegationOwner): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.updateDelegationOwner({
            emitterUserID,
            newDelegationOwnerUserID,
            runID,
            workflowID: roomID,
        });
    }

    public static async updateControlAndDelegationPermission({
        roomID,
        toUpdateUserID,
        hasControlAndDelegationPermission,
    }: OnUpdateControlAndDelegationPermissionArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.updateControlAndDelegationPermission({
            runID,
            workflowID: roomID,
            toUpdateUserID,
            hasControlAndDelegationPermission,
        });
    }

    public static async checkUserDevicesPositionIfRoomHasPositionConstraints(
        user: User,
        mtvRoomID: string,
    ): Promise<void> {
        const room = await MtvRoom.findOrFail(mtvRoomID);
        if (
            room.hasPositionAndTimeConstraints === false ||
            room.constraintLng === null ||
            room.constraintLat === null ||
            room.constraintRadius === null
        ) {
            return;
        }

        await user.load('devices');
        const everyDevicesResults: boolean[] = user.devices.map((device) => {
            if (device.lat === null || device.lng === null) {
                return false;
            }

            if (
                room.constraintLng === null ||
                room.constraintLat === null ||
                room.constraintRadius === null
            )
                return false;

            //radius is in meters
            return isPointWithinRadius(
                { latitude: device.lat, longitude: device.lng },
                {
                    latitude: room.constraintLat,
                    longitude: room.constraintLng,
                },
                room.constraintRadius,
            );
        });

        const oneDeviceFitTheConstraints = everyDevicesResults.some(
            (status) => status === true,
        );

        await ServerToTemporalController.updateUserFitsPositionConstraints({
            runID: room.runID,
            userID: user.uuid,
            workflowID: room.uuid,
            userFitsPositionConstraint: oneDeviceFitTheConstraints,
        });
    }
}
