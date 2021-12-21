import { randomUUID } from 'crypto';
import {
    MpeChangeTrackOrderOperationToApply,
    MpeChangeTrackOrderRequestBody,
    MpeCreateWorkflowResponse,
    MpeRoomClientToServerCreateArgs,
    MpeRoomServerToClientGetContextSuccessCallbackArgs,
} from '@musicroom/types';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { TypedSocket } from 'start/socket';
import MpeServerToTemporalController from '../Http/Temporal/MpeServerToTemporalController';
import { throwErrorIfUserIsNotInGivenMpeRoom } from '../../../start/mpeSocket';

interface MpeOnCreateArgs extends MpeRoomClientToServerCreateArgs {
    roomCreator: User;
}

interface MpeOnAddTracksArgs {
    roomID: string;
    tracksIDs: string[];
    userID: string;
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

    public static async onAddTracks({
        roomID,
        tracksIDs,
        userID,
        deviceID,
    }: MpeOnAddTracksArgs): Promise<void> {
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

    public static async onGetContext({
        roomID,
        user,
        socket,
    }: MpeOnGetContextArgs): Promise<MpeRoomServerToClientGetContextSuccessCallbackArgs> {
        try {
            const room = await MpeRoom.findOrFail(roomID);
            //If room is private look for mtvRoomInvitation

            const roomIsPrivate = !room.isOpen;
            if (roomIsPrivate) {
                throw new Error(
                    'to refactor after implem the mpe room invitations',
                );
            }

            const { state } = await MpeServerToTemporalController.getStateQuery(
                {
                    workflowID: roomID,
                },
            );

            await user.load('mpeRooms', (mpeRoomQuery) => {
                return mpeRoomQuery.where('uuid', roomID);
            });

            const userIsNotInRoom = user.mpeRooms === null;

            return {
                roomID,
                state,
                userIsNotInRoom,
            };
        } catch (e) {
            socket.emit('MPE_GET_CONTEXT_FAIL_CALLBACK', {
                roomID,
            });
            throw new Error('onGetContext error');
        }
    }
}
