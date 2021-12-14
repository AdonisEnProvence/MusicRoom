import {
    MpeChangeTrackOrderOperationToApply,
    MpeRoomClientToServerAddTracksArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomClientToServerCreateArgs,
    MpeRoomClientToServerDeleteTracksArgs,
} from '@musicroom/types';
import MpeRoomsWsController from 'App/Controllers/Ws/MpeRoomsWsController';
import MpeRoom from 'App/Models/MpeRoom';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { TypedSocket } from './socket';

interface IsUserInMpeRoomArgs {
    userID: string;
    roomID: string;
}

export async function throwErrorIfUserIsNotInGivenMpeRoom({
    userID,
    roomID,
}: IsUserInMpeRoomArgs): Promise<void> {
    await MpeRoom.query()
        .where('uuid', roomID)
        .andWhereHas('members', (queryUser) => {
            return queryUser.where('uuid', userID);
        })
        .firstOrFail();
}

export default function initMpeSocketEventListeners(socket: TypedSocket): void {
    socket.on('MPE_CREATE_ROOM', async (args) => {
        try {
            MpeRoomClientToServerCreateArgs.parse(args);

            const { user } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            const response = await MpeRoomsWsController.onCreate({
                ...args,
                roomCreator: user,
            });

            await SocketLifecycle.getConnectedSocketToRoom(
                response.workflowID,
                true,
            );

            Ws.io
                .to(response.workflowID)
                .emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', response.state);
        } catch (e) {
            console.error(e);
            socket.emit('MPE_CREATE_ROOM_FAIL');
        }
    });

    socket.on('MPE_ADD_TRACKS', async (rawArgs) => {
        const { roomID, tracksIDs } =
            MpeRoomClientToServerAddTracksArgs.parse(rawArgs);

        try {
            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await throwErrorIfUserIsNotInGivenMpeRoom({
                userID: user.uuid,
                roomID,
            });

            await MpeRoomsWsController.onAddTracks({
                roomID,
                tracksIDs,
                userID: user.uuid,
                deviceID,
            });
        } catch (e) {
            console.error(e);

            socket.emit('MPE_ADD_TRACKS_FAIL_CALLBACK', {
                roomID,
            });
        }
    });

    socket.on('MPE_CHANGE_TRACK_ORDER_DOWN', async (raw) => {
        try {
            const { fromIndex, trackID, roomID } =
                MpeRoomClientToServerChangeTrackOrderUpDownArgs.parse(raw);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onChangeTrackOrder(
                {
                    roomID,
                    trackID,
                    userID: user.uuid,
                    deviceID,
                    fromIndex,
                    operationToApply:
                        MpeChangeTrackOrderOperationToApply.Values.DOWN,
                },
                socket,
            );
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MPE_CHANGE_TRACK_ORDER_UP', async (raw) => {
        try {
            const { fromIndex, trackID, roomID } =
                MpeRoomClientToServerChangeTrackOrderUpDownArgs.parse(raw);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onChangeTrackOrder(
                {
                    roomID,
                    trackID,
                    userID: user.uuid,
                    deviceID,
                    fromIndex,
                    operationToApply:
                        MpeChangeTrackOrderOperationToApply.Values.UP,
                },
                socket,
            );
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MPE_DELETE_TRACKS', async (rawArgs) => {
        try {
            const { roomID, tracksIDs } =
                MpeRoomClientToServerDeleteTracksArgs.parse(rawArgs);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onDeleteTracks({
                socket,

                roomID,
                tracksIDs,
                userID: user.uuid,
                deviceID,
            });
        } catch (err) {
            console.error(err);
        }
    });
}
