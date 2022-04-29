import {
    MpeChangeTrackOrderOperationToApply,
    MpeRoomClientToServerAddTracksArgs,
    MpeRoomClientToServerChangeTrackOrderUpDownArgs,
    MpeRoomClientToServerCreateArgs,
    MpeRoomClientToServerCreatorInviteUserArgs,
    MpeRoomClientToServerDeleteTracksArgs,
    MpeRoomClientToServerExportToMtvArgs,
    MpeRoomClientToServerGetContextArgs,
    MpeRoomClientToServerJoinRoomArgs,
    MpeRoomClientToServerLeaveRoomArgs,
} from '@musicroom/types';
import MpeRoomsWsController from 'App/Controllers/Ws/MpeRoomsWsController';
import MtvRoomService from 'App/Services/MtvRoomService';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws, { TypedSocket } from 'App/Services/Ws';

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

    socket.on('MPE_JOIN_ROOM', async (rawArgs) => {
        try {
            const { roomID } = MpeRoomClientToServerJoinRoomArgs.parse(rawArgs);

            const { user } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onJoin({
                roomID,
                user,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MPE_ADD_TRACKS', async (rawArgs) => {
        const { roomID, tracksIDs } =
            MpeRoomClientToServerAddTracksArgs.parse(rawArgs);

        try {
            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onAddTracks({
                roomID,
                tracksIDs,
                user,
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

    socket.on(`MPE_GET_CONTEXT`, async (rawArgs) => {
        try {
            const { roomID } =
                MpeRoomClientToServerGetContextArgs.parse(rawArgs);

            const { user } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            const response = await MpeRoomsWsController.onGetContext({
                roomID,
                socket,
                user,
            });

            socket.emit('MPE_GET_CONTEXT_SUCCESS_CALLBACK', response);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('MPE_EXPORT_TO_MTV', async (rawArgs) => {
        try {
            const { roomID, mtvRoomOptions } =
                MpeRoomClientToServerExportToMtvArgs.parse(rawArgs);

            MtvRoomService.validateMtvRoomOptions(mtvRoomOptions);

            const { user, deviceID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onExportToMtv({
                userID: user.uuid,
                roomID,
                deviceID,
                mtvRoomOptions,
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('MPE_CREATOR_INVITE_USER', async (rawArgs) => {
        try {
            const { invitedUserID, roomID } =
                MpeRoomClientToServerCreatorInviteUserArgs.parse(rawArgs);

            const {
                user: { uuid: invitingUserID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onCreatorInviteUser({
                invitedUserID,
                invitingUserID,
                roomID,
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on(`MPE_LEAVE_ROOM`, async (rawArgs) => {
        try {
            const { roomID } =
                MpeRoomClientToServerLeaveRoomArgs.parse(rawArgs);

            const { user } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MpeRoomsWsController.onLeaveRoom({
                roomID,
                user,
            });
        } catch (err) {
            console.error(err);
        }
    });
}
