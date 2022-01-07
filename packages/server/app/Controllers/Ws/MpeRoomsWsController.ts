import { randomUUID } from 'crypto';
import {
    MpeChangeTrackOrderOperationToApply,
    MpeChangeTrackOrderRequestBody,
    MpeCreateWorkflowResponse,
    MpeRoomClientToServerCreateArgs,
    MpeRoomServerToClientGetContextSuccessCallbackArgs,
    MpeRoomSummary,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
} from '@musicroom/types';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { TypedSocket } from 'start/socket';
import MpeRoomInvitation from 'App/Models/MpeRoomInvitation';
import invariant from 'tiny-invariant';
import MpeServerToTemporalController from '../Http/Temporal/MpeServerToTemporalController';

interface IsUserInMpeRoomArgs {
    userID: string;
    roomID: string;
}

export async function fromMpeRoomToMpeRoomSummary({
    room,
    userID,
}: {
    room: MpeRoom;
    userID: string;
}): Promise<MpeRoomSummary> {
    await room.load('creator');
    invariant(
        room.creator !== null,
        'should never occurs room.creator is null',
    );

    const relatedInvitationArray = await MpeRoomInvitation.query()
        .where('invited_user_id', userID)
        .andWhere('mpe_room_id', room.uuid)
        .andWhere('inviting_user_id', room.creator.uuid);
    const isInvited = relatedInvitationArray.length > 0;

    const { isOpen, uuid: roomID, name: roomName } = room;
    const roomSummary: MpeRoomSummary = {
        creatorName: room.creator.nickname,
        isInvited,
        isOpen,
        roomID,
        roomName,
    };
    return roomSummary;
}

export async function fromMpeRoomsToMpeRoomSummaries({
    mpeRooms,
    userID,
}: {
    mpeRooms: MpeRoom[];
    userID: string;
}): Promise<MpeRoomSummary[]> {
    return await Promise.all(
        mpeRooms.map(async (room) =>
            fromMpeRoomToMpeRoomSummary({
                room,
                userID,
            }),
        ),
    );
}

export async function IsUserInMpeRoom({
    userID,
    roomID,
}: IsUserInMpeRoomArgs): Promise<boolean> {
    const room = await MpeRoom.query()
        .where('uuid', roomID)
        .andWhereHas('members', (queryUser) => {
            return queryUser.where('uuid', userID);
        });

    return room.length !== 0;
}

export async function throwErrorIfUserIsNotInGivenMpeRoom({
    userID,
    roomID,
}: IsUserInMpeRoomArgs): Promise<MpeRoom> {
    return await MpeRoom.query()
        .where('uuid', roomID)
        .andWhereHas('members', (queryUser) => {
            return queryUser.where('uuid', userID);
        })
        .firstOrFail();
}

interface MpeOnCreateArgs extends MpeRoomClientToServerCreateArgs {
    roomCreator: User;
}

interface MpeOnJoinArgs {
    roomID: string;
    user: User;
}

interface MpeOnAddTracksArgs {
    roomID: string;
    tracksIDs: string[];
    user: User;
    deviceID: string;
}

interface MpeOnChangeTrackOrderArgs {
    operationToApply: MpeChangeTrackOrderOperationToApply;
    roomID: string;
    userID: string;
    deviceID: string;
    trackID: string;
    fromIndex: number;
}

interface MpeOnDeleteTracksArgs {
    socket: TypedSocket;

    roomID: string;
    tracksIDs: string[];
    userID: string;
    deviceID: string;
}

interface MpeOnGetContextArgs {
    user: User;
    socket: TypedSocket;
    roomID: string;
}

interface MpeOnLeaveRoomArgs {
    user: User;
    roomID: string;
}

interface MpeOnTerminateArgs {
    user: User;
    roomID: string;
}

interface OnExportToMtvArgs {
    userID: string;
    deviceID: string;
    roomID: string;
    mtvRoomOptions: MtvRoomCreationOptionsWithoutInitialTracksIDs;
}

interface OnCreatorInviteUserArgs {
    invitingUserID: string;
    invitedUserID: string;
    roomID: string;
}

export default class MpeRoomsWsController {
    public static async onCreate(
        args: MpeOnCreateArgs,
    ): Promise<MpeCreateWorkflowResponse> {
        const { roomCreator, ...rest } = args;
        const userID = roomCreator.uuid;

        /**
         * Checking args validity
         */
        const roomIsNotOpenAndIsOpenOnlyInvitedUsersCanEditIsTrue =
            !args.isOpen && args.isOpenOnlyInvitedUsersCanEdit === true;
        if (roomIsNotOpenAndIsOpenOnlyInvitedUsersCanEditIsTrue) {
            throw new Error('Mpe create room failed, given args are invalid');
        }

        /**
         * We need to create the socket-io room before the workflow
         * because we don't know if temporal will answer faster via the acknowledge
         * mtv room creation activity than adonis will execute this function
         */
        const roomID = randomUUID();
        let roomHasBeenSaved = false;
        const room = new MpeRoom();
        await UserService.joinEveryUserDevicesToRoom(roomCreator, roomID);

        /**
         * Check for room name duplication
         * If room name is found in db
         * Just add creator nickame after the room name
         */
        const roomWithCreatedRoomName = await MpeRoom.findBy('name', args.name);
        const roomNameIsAlreadyTaken = roomWithCreatedRoomName !== null;
        if (roomNameIsAlreadyTaken) {
            console.log(
                'MPE room with given name already exist attempt to make it unique',
            );

            const newName = `${args.name} (${roomCreator.nickname})`;
            const roomWithNewName = await MpeRoom.findBy('name', newName);
            if (roomWithNewName !== null) {
                console.log(
                    'MPE room with given name and given creator already exists',
                );
                throw new Error(
                    'Room with given name and creator already exists',
                );
            }

            args.name = newName;
            console.log({ newName });
        }
        ///

        try {
            const temporalResponse =
                await MpeServerToTemporalController.createMpeWorkflow({
                    ...rest,
                    workflowID: roomID,
                    userID,
                });

            room.merge({
                uuid: roomID,
                runID: temporalResponse.runID,
                name: args.name,
                //By setting this field lucid will manage the BelongsTo relationship
                creatorID: userID,
                isOpen: args.isOpen,
            });

            await room.save();
            roomHasBeenSaved = true;

            //Will associate both mpe to user and user to mpe relationship
            await room.related('members').save(roomCreator);
            console.log('created mpe room ', roomID);
            return temporalResponse;
        } catch (error) {
            console.error(error);

            await SocketLifecycle.deleteSocketIoRoom(roomID);
            if (roomHasBeenSaved) {
                await room.delete();
            }

            throw new Error('Temporal operation failed');
        }
    }

    public static async onJoin({ roomID, user }: MpeOnJoinArgs): Promise<void> {
        await MpeRoom.findOrFail(roomID);
        const { uuid: userID } = user;
        console.log(`USER ${userID} JOINS ${roomID}`);

        const userIsAlreadyInTheRoom = await IsUserInMpeRoom({
            roomID,
            userID,
        });
        if (userIsAlreadyInTheRoom) {
            throw new Error('Join mpe room user is already in room');
        }

        //TODO MpeRoomInvitations verifications as for as MTV

        const userHasBeenInvited = false;

        await MpeServerToTemporalController.joinWorkflow({
            workflowID: roomID,
            userID,
            userHasBeenInvited,
        });
    }

    public static async onAddTracks({
        roomID,
        tracksIDs,
        user,
        deviceID,
    }: MpeOnAddTracksArgs): Promise<void> {
        const { uuid: userID } = user;

        await throwErrorIfUserIsNotInGivenMpeRoom({
            userID,
            roomID,
        });

        await MpeServerToTemporalController.addTracks({
            workflowID: roomID,
            tracksIDs,
            userID,
            deviceID,
        });
    }

    public static async onChangeTrackOrder(
        params: MpeOnChangeTrackOrderArgs,
        socket: TypedSocket,
    ): Promise<void> {
        try {
            const { roomID, ...rest } = params;
            await throwErrorIfUserIsNotInGivenMpeRoom({
                userID: params.userID,
                roomID,
            });

            const body: MpeChangeTrackOrderRequestBody = {
                ...rest,
                workflowID: roomID,
            };
            await MpeServerToTemporalController.changeTrackOrder(body);
        } catch (e) {
            socket.emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK', {
                roomID: params.roomID,
            });
        }
    }

    public static async onDeleteTracks({
        roomID,
        tracksIDs,
        userID,
        deviceID,
    }: MpeOnDeleteTracksArgs): Promise<void> {
        await throwErrorIfUserIsNotInGivenMpeRoom({
            userID,
            roomID,
        });

        await MpeServerToTemporalController.deleteTracks({
            workflowID: roomID,
            tracksIDs,
            userID,
            deviceID,
        });
    }

    public static async onLeaveRoom({
        roomID,
        user,
    }: MpeOnLeaveRoomArgs): Promise<void> {
        try {
            const { uuid: userID } = user;
            const leavingRoom = await throwErrorIfUserIsNotInGivenMpeRoom({
                userID,
                roomID,
            });

            /**
             * No matter if the leaving user was creator or not
             * We need to disconnect every of his device from the room socket io instance
             * And to dissociate his relationship with the mtvRoom
             */
            await UserService.leaveEveryUserDevicesFromMpeRoom(user, roomID);
            await user.related('mpeRooms').detach([roomID]);

            /**
             * If the leaving user is the room creator we need
             * to terminate the workflow and forced disconnect
             * every remaining users
             */
            const leavingUserIsTheCreator = userID === leavingRoom.creatorID;
            console.log(
                'LEAVING USER IS THE CREATOR ',
                leavingUserIsTheCreator,
            );
            if (leavingUserIsTheCreator) {
                await SocketLifecycle.ownerLeavesMpeRoom({
                    creator: user,
                    ownedRoom: leavingRoom,
                });
            } else {
                await MpeServerToTemporalController.leaveWorkflow({
                    workflowID: roomID,
                    userID,
                });
            }
        } catch (err) {
            console.error(err);
            throw new Error('onLeaveRoom error');
        }
    }

    public static async onTerminate({
        roomID,
    }: MpeOnTerminateArgs): Promise<void> {
        try {
            await MpeServerToTemporalController.terminateWorkflow({
                workflowID: roomID,
            });
        } catch (err) {
            console.error(err);
            throw new Error('mpe terminate workflow error');
        }
    }

    public static async onGetContext({
        roomID,
        user,
        socket,
    }: MpeOnGetContextArgs): Promise<MpeRoomServerToClientGetContextSuccessCallbackArgs> {
        try {
            const room = await MpeRoom.findOrFail(roomID);

            await user.load('mpeRooms', (mpeRoomQuery) => {
                return mpeRoomQuery.where('uuid', roomID);
            });

            const roomIsPrivate = !room.isOpen;
            const userIsNotInRoom =
                user.mpeRooms === null ||
                (user.mpeRooms !== null && user.mpeRooms.length !== 1);

            //If room is private and user is not already in look for mtvRoomInvitation
            const userIsNotInRoomAndRoomIsPrivate =
                userIsNotInRoom && roomIsPrivate;
            if (userIsNotInRoomAndRoomIsPrivate) {
                throw new Error(
                    'to refactor after implem the mpe room invitations', //TODO
                );
            }

            const { state } = await MpeServerToTemporalController.getStateQuery(
                {
                    workflowID: roomID,
                },
            );

            return {
                roomID,
                state,
                userIsNotInRoom,
            };
        } catch (e) {
            console.log(e);
            socket.emit('MPE_GET_CONTEXT_FAIL_CALLBACK', {
                roomID,
            });
            throw new Error('onGetContext error');
        }
    }

    public static async onExportToMtv({
        userID,
        roomID,
        deviceID,
        mtvRoomOptions,
    }: OnExportToMtvArgs): Promise<void> {
        try {
            await throwErrorIfUserIsNotInGivenMpeRoom({
                userID,
                roomID,
            });

            await MpeServerToTemporalController.exportToMtv({
                workflowID: roomID,
                userID,
                deviceID,
                mtvRoomOptions,
            });
        } catch (err) {
            console.error(err);

            throw new Error('onExportToMtv error');
        }
    }

    public static async onCreatorInviteUser({
        invitedUserID,
        invitingUserID,
        roomID,
    }: OnCreatorInviteUserArgs): Promise<void> {
        const room = await MpeRoom.findOrFail(roomID);
        const invitedUser = await User.findOrFail(invitedUserID);

        const userIsNotRoomCreator = invitingUserID !== room.creatorID;

        if (userIsNotRoomCreator) {
            throw new Error(
                `Emitter user does not appear to be the mpe room creator`,
            );
        }

        const creatorIsInvitingHimself = invitedUser.uuid === invitingUserID;
        if (creatorIsInvitingHimself) {
            throw new Error('Creator cannot invite himself in his mpe room');
        }

        await invitedUser.load('mpeRooms', (mpeRoomQuery) => {
            return mpeRoomQuery.where('uuid', roomID);
        });
        const invitedUserIsAlreadyInTheRoom =
            invitedUser.mpeRooms !== null && invitedUser.mpeRooms.length === 1;
        if (invitedUserIsAlreadyInTheRoom) {
            throw new Error('Invited user is already in the mpe room');
        }

        await room.load('creator');
        if (room.creator === null) {
            throw new Error(
                'Should never occurs, creator relationship led to null',
            );
        }

        const createdInvitation = await MpeRoomInvitation.firstOrCreate({
            mpeRoomID: roomID,
            invitedUserID,
            invitingUserID,
        });

        //Isn'it a pb if first or create return first ? duplicating relationship ?
        await room.related('invitations').save(createdInvitation);

        const roomSummary: MpeRoomSummary = {
            creatorName: room.creator.nickname,
            isOpen: room.isOpen,
            roomID: room.uuid,
            roomName: room.name,
            isInvited: true,
        };

        await UserService.emitEventInEveryDeviceUser(
            invitedUserID,
            'MPE_RECEIVED_ROOM_INVITATION',
            [
                {
                    roomSummary,
                },
            ],
        );
    }
}
