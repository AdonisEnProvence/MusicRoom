import {
    MtvRoomGetRoomConstraintDetailsCallbackArgs,
    MtvRoomSummary,
    MtvRoomUpdateControlAndDelegationPermissionArgs,
    MtvRoomUpdateDelegationOwnerArgs,
    MtvRoomUsersListElement,
    MtvWorkflowState,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import MtvRoomInvitation from 'App/Models/MtvRoomInvitation';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { isPointWithinRadius } from 'geolib';
import MtvServerToTemporalController from '../Http/Temporal/MtvServerToTemporalController';

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

interface OnJoinArgs extends UserID, DeviceID {
    joiningRoom: MtvRoom;
}
interface OnLeaveArgs extends UserArgs {
    leavingRoomID: string;
}
interface OnPauseArgs extends RoomID {
    userID: string;
}
interface OnPlayArgs extends RoomID {
    userID: string;
}
interface OnTerminateArgs extends RoomID, RunID {}
interface OnGetStateArgs extends RoomID, UserID {}
interface OnGetUsersListArgs {
    roomID: string;
    userID: string;
}
interface OnGoToNextTrackArgs extends RoomID {
    userID: string;
}
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

interface OnCreatorInviteUserArgs {
    invitedUserID: string;
    emitterUserID: string;
    roomID: string;
}

interface OnVoteForTrackArgs extends RoomID, UserID {
    trackID: string;
}

type RoomConstraintInformation = Pick<
    MtvRoom,
    | 'constraintLat'
    | 'constraintLng'
    | 'constraintRadius'
    | 'hasPositionAndTimeConstraints'
>;
interface CheckUserDevicesPositionIfRoomHasPositionConstraintsArgs {
    user: User;
    roomConstraintInformation: RoomConstraintInformation;
    persistToTemporalRequiredInformation:
        | {
              runID: string;
              roomID: string;
          }
        | undefined;
}

interface OnGetRoomConstraintsDetailsArgs {
    roomID: string;
}

export default class MtvRoomsWsController {
    public static async onJoin({
        userID,
        joiningRoom: { runID, uuid: roomID, isOpen, creatorID },
        deviceID,
    }: OnJoinArgs): Promise<void> {
        console.log(`USER ${userID} JOINS ${roomID}`);
        const roomIsPrivate = !isOpen;

        //Looking for an invitation
        const userAndRoomRelatedInvitations = await MtvRoomInvitation.query()
            .where('mtv_room_id', roomID)
            .andWhere('invited_user_id', userID)
            .andWhere('inviting_user_id', creatorID);

        const foundSeveralInvitationForSameUserAndRoom =
            userAndRoomRelatedInvitations.length > 1;
        if (foundSeveralInvitationForSameUserAndRoom) {
            throw new Error(
                `onJoin failed, found several invitation for given user, should never occurs,
                each invitation has unicity on it's content`,
            );
        }

        const userHasNotBeenInvitedInPrivateRoom =
            roomIsPrivate && userAndRoomRelatedInvitations.length === 0;
        if (userHasNotBeenInvitedInPrivateRoom) {
            throw new Error(
                `onJoin failed, user has to be invited to join a private room`,
            );
        }

        const userHasBeenInvited = userAndRoomRelatedInvitations.length === 1;
        ///

        await MtvServerToTemporalController.joinWorkflow({
            workflowID: roomID,
            runID: runID,
            userID,
            deviceID,
            userHasBeenInvited,
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
        await UserService.leaveEveryUserDevicesFromMtvRoom(user, leavingRoomID);
        await user.related('mtvRoom').dissociate();

        /**
         * If the leaving user is the room creator we need
         * to terminate the workflow and forced disconnect
         * every remaining users
         */
        const leavingUserIsTheCreator = userID === creatorID;
        console.log('LEAVING USER IS THE CREATOR ', leavingUserIsTheCreator);
        if (leavingUserIsTheCreator) {
            await SocketLifecycle.ownerLeavesMtvRoom(leavingRoom);
        } else {
            await MtvServerToTemporalController.leaveWorkflow({
                workflowID: leavingRoomID,
                runID: runID,
                userID,
            });
        }
    }

    public static async onPause({
        roomID,
        userID,
    }: OnPauseArgs): Promise<void> {
        console.log(`PAUSE ${roomID}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await MtvServerToTemporalController.pause({
            workflowID: roomID,
            runID,
            userID,
        });
    }

    public static async onPlay({ roomID, userID }: OnPlayArgs): Promise<void> {
        console.log(`PLAY ${roomID} `);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await MtvServerToTemporalController.play({
            workflowID: roomID,
            runID,
            userID,
        });
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
        await MtvServerToTemporalController.terminateWorkflow({
            workflowID: roomID,
            runID: runID,
        });
    }

    public static async onGetState({
        roomID,
        userID,
    }: OnGetStateArgs): Promise<MtvWorkflowState> {
        const room = await MtvRoom.findOrFail(roomID);
        return await MtvServerToTemporalController.getState({
            workflowID: roomID,
            runID: room.runID,
            userID,
        });
    }

    public static async onGetUsersList({
        userID,
        roomID,
    }: OnGetUsersListArgs): Promise<MtvRoomUsersListElement[]> {
        const room = await MtvRoom.findOrFail(roomID);
        const temporalFormatedUsersList =
            await MtvServerToTemporalController.getUsersList({
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
                const isMe = pgUser.uuid === userID;

                return {
                    ...temporalUser,
                    nickname: pgUser.nickname,
                    avatar: undefined,
                    isMe,
                };
            });

        if (formattedUsersList.length === 0) {
            throw new Error('FormattedUsersList is empty');
        }

        return formattedUsersList;
    }

    public static async onGoToNextTrack({
        roomID,
        userID,
    }: OnGoToNextTrackArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await MtvServerToTemporalController.goToNextTrack({
            workflowID: roomID,
            runID,
            userID,
        });
    }

    public static async onChangeEmittingDevice({
        deviceID,
        roomID,
        userID,
    }: OnChangeEmittingDeviceArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await MtvServerToTemporalController.changeUserEmittingDevice({
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

        await MtvServerToTemporalController.suggestTracks({
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

        await MtvServerToTemporalController.voteForTrack({
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

        await MtvServerToTemporalController.updateDelegationOwner({
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

        await MtvServerToTemporalController.updateControlAndDelegationPermission(
            {
                runID,
                workflowID: roomID,
                toUpdateUserID,
                hasControlAndDelegationPermission,
            },
        );
    }

    public static async checkUserDevicesPositionIfRoomHasPositionConstraints({
        roomConstraintInformation: {
            constraintLat,
            constraintLng,
            constraintRadius,
            hasPositionAndTimeConstraints,
        },
        user,
        persistToTemporalRequiredInformation,
    }: CheckUserDevicesPositionIfRoomHasPositionConstraintsArgs): Promise<boolean> {
        if (
            hasPositionAndTimeConstraints === false ||
            constraintLng === null ||
            constraintLat === null ||
            constraintRadius === null
        ) {
            return false;
        }

        await user.load('devices', (devicesQuery) => {
            return devicesQuery
                .whereNotNull('lat_lng_updated_at')
                .andWhereNotNull('lat')
                .andWhereNotNull('lng')
                .andWhereRaw(`lat_lng_updated_at >= NOW() - INTERVAL '1 DAY'`);
        });
        if (user.devices === null) {
            throw new Error('should never occurs user has no related devices');
        }
        const everyDevicesResults: boolean[] = user.devices.map((device) => {
            if (device.lat === null || device.lng === null) {
                return false;
            }

            //radius is in meters
            return isPointWithinRadius(
                { latitude: device.lat, longitude: device.lng },
                {
                    latitude: constraintLat,
                    longitude: constraintLng,
                },
                constraintRadius,
            );
        });

        //If devices array is empty some will return false
        const oneDeviceFitTheConstraints = everyDevicesResults.some(
            (status) => status === true,
        );

        if (persistToTemporalRequiredInformation !== undefined) {
            await MtvServerToTemporalController.updateUserFitsPositionConstraints(
                {
                    runID: persistToTemporalRequiredInformation.runID,
                    userID: user.uuid,
                    workflowID: persistToTemporalRequiredInformation.roomID,
                    userFitsPositionConstraint: oneDeviceFitTheConstraints,
                },
            );
        }

        return oneDeviceFitTheConstraints;
    }

    public static async onCreatorInviteUser({
        invitedUserID,
        emitterUserID,
        roomID,
    }: OnCreatorInviteUserArgs): Promise<void> {
        const room = await MtvRoom.findOrFail(roomID);
        const invitedUser = await User.findOrFail(invitedUserID);

        const userIsNotRoomCreator = emitterUserID !== room.creatorID;

        if (userIsNotRoomCreator) {
            throw new Error(
                `Emitter user does not appear to be the room creator`,
            );
        }

        const creatorIsInvitingHimself = invitedUser.uuid === emitterUserID;
        if (creatorIsInvitingHimself) {
            throw new Error('Creator cannot invite himself in his room');
        }

        const invitedUserIsAlreadyInTheRoom = invitedUser.mtvRoomID === roomID;
        if (invitedUserIsAlreadyInTheRoom) {
            throw new Error('Invited user is already in the room');
        }

        await room.load('creator');
        if (room.creator === null) {
            throw new Error(
                'Should never occurs, creator relationship led to null',
            );
        }

        const createdInvitation = await MtvRoomInvitation.firstOrCreate({
            mtvRoomID: roomID,
            invitedUserID,
            invitingUserID: emitterUserID,
        });

        await room.related('invitations').save(createdInvitation);

        const roomSummary: MtvRoomSummary = {
            creatorName: room.creator.nickname,
            isOpen: room.isOpen,
            roomID: room.uuid,
            roomName: room.name,
            isInvited: true,
        };

        await UserService.emitEventInEveryDeviceUser(
            invitedUserID,
            'MTV_RECEIVED_ROOM_INVITATION',
            [roomSummary],
        );
    }

    public static async onGetRoomConstraintsDetails({
        roomID,
    }: OnGetRoomConstraintsDetailsArgs): Promise<MtvRoomGetRoomConstraintDetailsCallbackArgs> {
        console.log('onGetRoomConstraintsDetails send');
        const { hasPositionAndTimeConstraints, runID } =
            await MtvRoom.findOrFail(roomID);
        const roomDoesnotHaveAnyConstraints = !hasPositionAndTimeConstraints;

        if (roomDoesnotHaveAnyConstraints) {
            throw new Error(
                "onGetRoomConstraintsDetails room doesn't have any constraints",
            );
        }

        return await MtvServerToTemporalController.getRoomConstraintsDetails({
            workflowID: roomID,
            runID,
        });
    }
}
