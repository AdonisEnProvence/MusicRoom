import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

Ws.boot();

export type TypedSocket = Socket<
    AllClientToServerEvents,
    AllServerToClientEvents,
    DefaultEventsMap
>;

Ws.io.on('connection', async (socket) => {
    try {
        ChatController.onConnect({ socket, payload: undefined });

        const hasDeviceNotBeenFound =
            (await Device.findBy('socket_id', socket.id)) === null;
        if (hasDeviceNotBeenFound) {
            await SocketLifecycle.registerDevice(socket);
        } else {
            console.log('socketID already registered');
        }
        /// CHAT ///
        socket.on('NEW_MESSAGE', (payload) => {
            ChatController.onWriteMessage({ socket, payload });
        });
        /// //// ///

        /// ROOM ///
        socket.on('CREATE_ROOM', async (payload) => {
            try {
                const { userID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (!payload.name) {
                    throw new Error('CREATE_ROOM failed name should be empty');
                }
                await MtvRoomsWsController.onCreate({
                    socket,
                    payload: {
                        name: payload.name,
                        userID,
                        initialTracksIDs: payload.initialTracksIDs,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('GET_CONTEXT', async (cb) => {
            try {
                //TODO CHECK AUTH, socket id is in mtvRoom
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error(
                        "GET_CONTEXT failed user doesn't have a mtvRoom",
                    );
                }
                cb({
                    context: await MtvRoomsWsController.onGetState(mtvRoomID),
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('JOIN_ROOM', async (args) => {
            try {
                if (!args.roomID) {
                    throw new Error('JOIN_ROOM failed roomID is empty');
                }
                const { userID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                await MtvRoomsWsController.onJoin({
                    socket,
                    payload: {
                        roomID: args.roomID,
                        userID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PLAY', async () => {
            try {
                //we need to check auth from socket id into a userId into a room users[]
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPlay({
                    socket,
                    payload: {
                        roomID: mtvRoomID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ACTION_PAUSE', async () => {
            try {
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error('ACTION_PLAY failed room not found');
                }
                await MtvRoomsWsController.onPause({
                    socket,
                    payload: {
                        roomID: mtvRoomID,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('GO_TO_NEXT_TRACK', async () => {
            try {
                const { mtvRoomID } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );

                if (mtvRoomID === undefined) {
                    throw new Error(
                        'Can not go to the next track, the user is not listening to a mtv room',
                    );
                }

                await MtvRoomsWsController.onGoToNextTrack({
                    payload: {
                        roomID: mtvRoomID,
                    },
                    socket,
                });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('disconnecting', async () => {
            try {
                await SocketLifecycle.checkForMtvRoomDeletion(socket);
            } catch (e) {
                console.error('Error on socket.on(disconnecting)', e);
            }
        });
    } catch (e) {
        console.error(e);
    }
});
