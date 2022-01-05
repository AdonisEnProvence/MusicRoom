import {
    MtvRoomClientToServerCreateArgs,
    MtvRoomCreatorInviteUserArgs,
    MtvRoomUpdateControlAndDelegationPermissionArgs,
    MtvRoomUpdateDelegationOwnerArgs,
} from '@musicroom/types';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import MtvRoomsChatController from 'App/Controllers/Ws/MtvRoomsChatController';
import MtvRoomService from 'App/Services/MtvRoomService';
import { TypedSocket } from './socket';

export default function initMtvSocketEventListeners(socket: TypedSocket): void {
    /// CHAT ///
    socket.on('MTV_NEW_MESSAGE', async (payload) => {
        try {
            //TODO fix
            await MtvRoomsChatController.onSendMessage({
                socket,
                payload,
            });
        } catch (e) {
            console.error('Error while broadcasting message', e);
        }
    });
    /// //// ///

    /// ROOM ///
    socket.on('MTV_CREATE_ROOM', async (rawPayload) => {
        try {
            const payload = MtvRoomClientToServerCreateArgs.parse(rawPayload);

            MtvRoomService.validateMtvRoomOptions(payload);

            const {
                user,
                deviceID,
                mtvRoomID: currentMtvRoomID,
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            await MtvRoomService.createMtvRoom({
                user,
                deviceID,
                options: payload,
                currentMtvRoomID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_GET_CONTEXT', async () => {
        try {
            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);
            if (mtvRoomID === undefined) {
                throw new Error(
                    "MTV_GET_CONTEXT failed user doesn't have a mtvRoom",
                );
            }

            const state = await MtvRoomsWsController.onGetState({
                roomID: mtvRoomID,
                userID,
            });
            socket.emit('MTV_RETRIEVE_CONTEXT', state);
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_JOIN_ROOM', async ({ roomID }) => {
        try {
            if (!roomID) {
                throw new Error('MTV_JOIN_ROOM failed roomID is empty');
            }

            const joiningRoom = await SocketLifecycle.doesRoomExist(roomID);
            if (joiningRoom === null) {
                throw new Error(
                    `Join failed given roomID does not match with any room ${roomID}`,
                );
            }

            const {
                user,
                deviceID,
                mtvRoomID: currMtvRoomID,
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            console.log(`JOIN SIGNAL RECEIVE FOR USER ${user.uuid}`);
            /**
             * Checking if user needs to leave previous
             * mtv room before joining new one
             */
            if (currMtvRoomID !== undefined) {
                console.log(
                    `User needs to leave current room before joining new one`,
                );
                await MtvRoomsWsController.onLeave({
                    user,
                    leavingRoomID: currMtvRoomID,
                });
            }

            await MtvRoomsWsController.onJoin({
                joiningRoom,
                userID: user.uuid,
                deviceID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_LEAVE_ROOM', async () => {
        try {
            const { user, mtvRoomID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            /**
             * Remark: no need to verify if room exists such as for the join event
             * As when a room get evicted it will remove the foreignKey in the user model
             * Then if mtvRoomID is defined in the User model it means the room is listed
             * in base
             */
            if (mtvRoomID === undefined) {
                throw new Error(
                    `Leave fails user is not related to any mtv room ${user.uuid}`,
                );
            }

            await MtvRoomsWsController.onLeave({
                user,
                leavingRoomID: mtvRoomID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_ACTION_PLAY', async () => {
        try {
            //we need to check auth from socket id into a userId into a room users[]
            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);
            if (mtvRoomID === undefined) {
                throw new Error('MTV_ACTION_PLAY failed room not found');
            }
            await MtvRoomsWsController.onPlay({
                roomID: mtvRoomID,
                userID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_ACTION_PAUSE', async () => {
        try {
            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);
            if (mtvRoomID === undefined) {
                throw new Error('MTV_ACTION_PLAY failed room not found');
            }
            await MtvRoomsWsController.onPause({
                roomID: mtvRoomID,
                userID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_GO_TO_NEXT_TRACK', async () => {
        try {
            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'Can not go to the next track, the user is not listening to a mtv room',
                );
            }

            await MtvRoomsWsController.onGoToNextTrack({
                roomID: mtvRoomID,
                userID,
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('MTV_CHANGE_EMITTING_DEVICE', async ({ newEmittingDeviceID }) => {
        try {
            console.log('RECEIVED CHANGE EMITTING DEVICE FORM CLIENT');
            const {
                user: { uuid: userID },
                mtvRoomID,
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (!mtvRoomID) {
                throw new Error(
                    'Error on MTV_CHANGE_EMITTING_DEVICE cannot change emitting device if user is not in a mtvRoom',
                );
            }

            const newEmittingDevice = await Device.findOrFail(
                newEmittingDeviceID,
            );

            await newEmittingDevice.load('user');
            if (!newEmittingDevice.user) {
                throw new Error('newEmittingDevice.user should not be empty');
            }

            const userIsNotTheNewDeviceOwner =
                newEmittingDevice.user.uuid !== userID;

            if (userIsNotTheNewDeviceOwner) {
                throw new Error(
                    `device: ${newEmittingDeviceID} does not belongs to userID: ${userID}`,
                );
            }
            console.log(
                'RECEIVED CHANGE EMITTING DEVICE FORM CLIENT EVERYTHING IS OK',
            );

            await MtvRoomsWsController.onChangeEmittingDevice({
                deviceID: newEmittingDeviceID,
                roomID: mtvRoomID,
                userID: userID,
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('MTV_SUGGEST_TRACKS', async ({ tracksToSuggest }) => {
        try {
            const {
                mtvRoomID,
                user: { uuid: userID },
                deviceID,
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);
            if (mtvRoomID === undefined) {
                throw new Error(
                    'Can not suggest tracks, the user is not listening to a mtv room',
                );
            }

            await MtvRoomsWsController.onTracksSuggestion({
                roomID: mtvRoomID,
                tracksToSuggest,
                userID,
                deviceID,
            });
        } catch (err) {
            socket.emit('MTV_SUGGEST_TRACKS_FAIL_CALLBACK');
            console.error(err);
        }
    });

    socket.on('MTV_VOTE_FOR_TRACK', async ({ trackID }) => {
        try {
            if (!trackID) {
                throw new Error('payload is invalid');
            }

            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'MTV_VOTE_FOR_TRACK user is not related to any room',
                );
            }

            await MtvRoomsWsController.voteForTrack({
                roomID: mtvRoomID,
                trackID,
                userID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_UPDATE_DELEGATION_OWNER', async (payload) => {
        try {
            MtvRoomUpdateDelegationOwnerArgs.parse(payload);

            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'MTV_UPDATE_DELEGATION_OWNER user is not related to any room',
                );
            }

            await MtvRoomsWsController.updateDelegationOwner({
                roomID: mtvRoomID,
                emitterUserID: userID,
                newDelegationOwnerUserID: payload.newDelegationOwnerUserID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on(
        'MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION',
        async (rawPayload) => {
            try {
                const { toUpdateUserID, hasControlAndDelegationPermission } =
                    MtvRoomUpdateControlAndDelegationPermissionArgs.parse(
                        rawPayload,
                    );

                const { mtvRoomID, user } =
                    await SocketLifecycle.getSocketConnectionCredentials(
                        socket,
                    );
                if (mtvRoomID === undefined) {
                    throw new Error(
                        'MTV_UPDATE_CONTROL_AND_DELEGATION_PERMISSION user is not related to any room',
                    );
                }

                await user.load('mtvRoom');
                const roomCreatorUuid = user.mtvRoom.creatorID;
                const isRoomCreator = user.uuid === roomCreatorUuid;
                const isNotRoomCreator = isRoomCreator === false;
                if (isNotRoomCreator === true) {
                    throw new Error(
                        'User is not room creator. Only the room creator can update control and delegation permission.',
                    );
                }

                await MtvRoomsWsController.updateControlAndDelegationPermission(
                    {
                        roomID: mtvRoomID,
                        toUpdateUserID,
                        hasControlAndDelegationPermission,
                    },
                );
            } catch (e) {
                console.error(e);
            }
        },
    );

    socket.on('MTV_GET_USERS_LIST', async (callback) => {
        try {
            const {
                mtvRoomID,
                user: { uuid: userID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'MTV_UPDATE_DELEGATION_OWNER user is not related to any room',
                );
            }

            const usersList = await MtvRoomsWsController.onGetUsersList({
                userID,
                roomID: mtvRoomID,
            });
            callback(usersList);
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_CREATOR_INVITE_USER', async (rawPayload) => {
        try {
            const { invitedUserID } =
                MtvRoomCreatorInviteUserArgs.parse(rawPayload);

            const {
                mtvRoomID,
                user: { uuid: emitterUserID },
            } = await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'MTV_CREATOR_INVITE_USER user is not related to any room',
                );
            }

            await MtvRoomsWsController.onCreatorInviteUser({
                invitedUserID,
                emitterUserID,
                roomID: mtvRoomID,
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('MTV_GET_ROOM_CONSTRAINTS_DETAILS', async (callback) => {
        try {
            const { mtvRoomID } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            if (mtvRoomID === undefined) {
                throw new Error(
                    'GET_ROOM_CONSTRAINT_DETAILS user is not related to any room',
                );
            }

            const args = await MtvRoomsWsController.onGetRoomConstraintsDetails(
                {
                    roomID: mtvRoomID,
                },
            );

            callback(args);
        } catch (e) {
            console.error(e);
        }
    });
    /// //// ///
}
