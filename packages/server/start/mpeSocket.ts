import {
    MpeRoomClientToServerAddTracksArgs,
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

async function isUserInMpeRoom({
    userID,
    roomID,
}: IsUserInMpeRoomArgs): Promise<boolean> {
    const mpeRoom = await MpeRoom.query()
        .where('uuid', roomID)
        .andWhereHas('members', (queryUser) => {
            queryUser.where('uuid', userID);
        })
        .first();
    const isUserInRoom = mpeRoom !== null;

    return isUserInRoom;
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
        try {
            const { roomID, tracksIDs } =
                MpeRoomClientToServerAddTracksArgs.parse(rawArgs);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            const isInRoom = await isUserInMpeRoom({
                userID: user.uuid,
                roomID,
            });
            if (isInRoom === false) {
                throw new Error('User is not in room');
            }

            await MpeRoomsWsController.onAddTracks({
                roomID,
                tracksIDs,
                userID: user.uuid,
                deviceID,
            });
        } catch (e) {
            console.error(e);
            socket.emit('MPE_ADD_TRACKS_FAIL_CALLBACK');
        }
    });
}
