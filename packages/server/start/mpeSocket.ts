import { userAgent } from '@googlemaps/google-maps-services-js';
import {
    MpeChangeTrackOrderOperationToApply,
    MpeRoomClientToServerAddTracksArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomClientToServerCreateArgs,
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

async function throwErrorIfUserIsNotInGivenMpeRoom({
    userID,
    roomID,
}: IsUserInMpeRoomArgs): Promise<void> {
    const mpeRoom = await MpeRoom.query()
        .where('uuid', roomID)
        .andWhereHas('members', (queryUser) => {
            return queryUser.where('uuid', userID);
        })
        .first();
    const userIsNotInRoom = mpeRoom === null;
    if (userIsNotInRoom) {
        throw new Error('User is not in given MPE room');
    }
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

            await throwErrorIfUserIsNotInGivenMpeRoom({
                userID: user.uuid,
                roomID,
            });

            await MpeRoomsWsController.onChangeTrackOrder({
                roomID,
                trackID,
                userID: user.uuid,
                deviceID,
                fromIndex,
                operationToApply:
                    MpeChangeTrackOrderOperationToApply.Values.DOWN,
            });
        } catch (e) {
            console.error(e);

            socket.emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK');
        }
    });

    socket.on('MPE_CHANGE_TRACK_ORDER_UP', async (raw) => {
        try {
            const { fromIndex, trackID, roomID } =
                MpeRoomClientToServerChangeTrackOrderUpDownArgs.parse(raw);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await throwErrorIfUserIsNotInGivenMpeRoom({
                userID: user.uuid,
                roomID,
            });

            await MpeRoomsWsController.onChangeTrackOrder({
                roomID,
                trackID,
                userID: user.uuid,
                deviceID,
                fromIndex,
                operationToApply: MpeChangeTrackOrderOperationToApply.Values.UP,
            });
        } catch (e) {
            console.error(e);

            socket.emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK');
        }
    });
}
