import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import User from 'App/Models/User';
import { TypedSocket } from 'start/socket';
import UserAgentParser from 'ua-parser-js';
import MtvRoom from '../Models/MtvRoom';
import UserService from './UserService';
import Ws from './Ws';

function generateCustomDeviceNameFromWebBrowserUserAgent(
    userAgent: string,
): string {
    const ua = UserAgentParser(userAgent);
    const browser = ua.browser.name;

    return `Web Player (${browser ?? 'Unkown browser'})`;
}

export default class SocketLifecycle {
    /**
     * Make the given socket joins the given mtvRoomID
     * @param socket socket to sync
     * @param mtvRoomID room whom to be sync with
     */
    private static async syncMtvRoomContext(
        socket: TypedSocket,
        mtvRoomID: string,
    ): Promise<void> {
        const adapter = Ws.adapter();
        await adapter.remoteJoin(socket.id, mtvRoomID);
    }

    public static async doesRoomExist(roomID: string): Promise<MtvRoom | null> {
        // const userID = user.uuid;

        const room = await MtvRoom.find(roomID);
        const roomExist = room !== null;
        const joiningRoomDoesntExistInAnySocketNodes = !(
            await Ws.adapter().allRooms()
        ).has(roomID);

        /**
         * If a room is listed in database
         * It must be listed in one socket node as
         * a socket io room else it's a corrupted room
         */
        if (roomExist && joiningRoomDoesntExistInAnySocketNodes) {
            throw new Error(
                'Room exist in database but does not exist in any socket io server instance ' +
                    roomID,
            );
        }

        return room;
    }

    /**
     * Register device from socket informations
     *  - query userID
     *  - userAgent
     * Then associates it to the creator userModel
     * @param socket Socket to match to a device
     */
    public static async registerDevice(socket: TypedSocket): Promise<Device> {
        const queryUserID = socket.handshake.query['userID'];
        let deviceName = socket.handshake.query['deviceName'];

        console.log(`registering a device for user ${queryUserID}`);
        if (!queryUserID || typeof queryUserID !== 'string') {
            throw new Error('Empty or invalid user token');
        }

        if (
            typeof deviceName !== 'string' &&
            typeof deviceName !== 'undefined'
        ) {
            throw new Error('Invalid device name');
        }

        const userAgent = socket.request.headers['user-agent'];

        if (userAgent === undefined) {
            throw new Error('user agent should not be null');
        }

        const deviceOwner = await User.findOrFail(queryUserID);

        if (deviceName === undefined) {
            deviceName =
                generateCustomDeviceNameFromWebBrowserUserAgent(userAgent);
        }

        const newDevice = await Device.create({
            socketID: socket.id,
            userID: queryUserID,
            userAgent,
            name: deviceName,
        });
        await newDevice.related('user').associate(deviceOwner);

        return newDevice;
    }

    /**
     * Will look for user related MTV room and will sync
     * given socket to the mtv room socket io room
     */
    public static async registeredDeviceLookForMtvContext({
        socket,
        newDevice,
    }: {
        socket: TypedSocket;
        newDevice: Device;
    }): Promise<void> {
        await newDevice.load('user');
        const deviceOwner = newDevice.user;
        if (deviceOwner === null) {
            throw new Error("device hasn't been sync correctly to it's user");
        }

        if (deviceOwner.mtvRoomID) {
            await deviceOwner.load('mtvRoom');
            if (deviceOwner.mtvRoom === undefined) {
                throw new Error(
                    'should never occurs deviceOwner mtvRoom relationship is undefined',
                );
            }

            const {
                constraintLat,
                constraintLng,
                constraintRadius,
                hasPositionAndTimeConstraints,
                runID,
                uuid: roomID,
            } = deviceOwner.mtvRoom;
            console.log(
                `User ${deviceOwner.uuid} is already a mtv room member, retrieve context`,
            );

            await this.syncMtvRoomContext(socket, deviceOwner.mtvRoomID);
            await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                {
                    user: deviceOwner,
                    persistToTemporalRequiredInformation: {
                        runID,
                        roomID,
                    },
                    roomConstraintInformation: {
                        constraintLat,
                        constraintLng,
                        constraintRadius,
                        hasPositionAndTimeConstraints,
                    },
                },
            );
        }
        await UserService.emitConnectedDevicesUpdateToEveryUserDevices(
            deviceOwner.uuid,
        );
    }

    public static async deleteDeviceAndCheckForMtvRoomDeletion(
        socketID: string,
    ): Promise<void> {
        console.log('_'.repeat(10));
        const disconnectingDevice = await Device.findByOrFail(
            'socket_id',
            socketID,
        );
        const userID = disconnectingDevice.userID;
        await disconnectingDevice.load('user');
        if (disconnectingDevice.user === null) {
            throw new Error('Device must have a related user');
        }

        const disconnectingDeviceOwner = disconnectingDevice.user;
        const relatedMtvRoomID = disconnectingDeviceOwner.mtvRoomID;

        console.log(`LOOSING CONNECTION SOCKETID=${socketID} USER=${userID}`);

        await disconnectingDevice.delete();
        await disconnectingDeviceOwner.load('devices', (devicesQuery) => {
            return devicesQuery.orderBy([
                {
                    column: 'created_at',
                    order: 'asc',
                },
            ]);
        });
        const allUserDevices = disconnectingDeviceOwner.devices;

        const disconnectingDeviceIsThelastConnectedDevice =
            allUserDevices.length === 0;

        console.log(
            `User is disconnecting has ${allUserDevices.length} connected`,
        );

        if (relatedMtvRoomID !== null) {
            if (disconnectingDeviceIsThelastConnectedDevice) {
                //User needs to be removed from the room doesn't have any connected device anymore
                await MtvRoomsWsController.onLeave({
                    user: disconnectingDeviceOwner,
                    leavingRoomID: relatedMtvRoomID,
                });
            } else {
                if (disconnectingDevice.isEmitting) {
                    /**
                     * If the evicted device was the emitting one
                     * we need to set a new as emitting
                     */
                    try {
                        const newEmittingDevice = allUserDevices[0];

                        await MtvRoomsWsController.onChangeEmittingDevice({
                            deviceID: newEmittingDevice.uuid,
                            roomID: relatedMtvRoomID,
                            userID,
                        });
                    } catch (e) {
                        console.error(
                            `Couldnt set a new emitting device for disconnecting user ${userID}`,
                            e,
                        );
                    }
                }

                await disconnectingDeviceOwner.load('mtvRoom');
                if (disconnectingDeviceOwner.mtvRoom === null) {
                    throw new Error(
                        'User should still be associed to the mtvRoom',
                    );
                }

                const {
                    constraintLat,
                    constraintLng,
                    constraintRadius,
                    hasPositionAndTimeConstraints,
                    runID,
                    uuid: roomID,
                } = disconnectingDeviceOwner.mtvRoom;
                await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                    {
                        user: disconnectingDeviceOwner,
                        roomConstraintInformation: {
                            constraintLat,
                            constraintLng,
                            constraintRadius,
                            hasPositionAndTimeConstraints,
                        },
                        persistToTemporalRequiredInformation: {
                            runID,
                            roomID,
                        },
                    },
                );
            }
        }

        await UserService.emitConnectedDevicesUpdateToEveryUserDevices(userID);
        console.log('='.repeat(10));
    }

    /**
     * return a set containing every connected socket to roomID
     * @param roomID concerned room
     * @param log if true console.log result
     */
    public static async getConnectedSocketToRoom(
        roomID: string,
        log?: boolean,
    ): Promise<Set<string>> {
        const connectedSockets = await Ws.adapter().sockets(new Set([roomID]));
        if (log) console.log({ roomID, connectedSockets });
        return connectedSockets;
    }

    /**
     * Disconnect every connected sockets in roomID
     * @param roomID room about to be deleted
     */
    public static async deleteSocketIoRoom(roomID: string): Promise<void> {
        const adapter = Ws.adapter();
        const connectedSockets = await this.getConnectedSocketToRoom(roomID);
        console.log(
            `ABOUT TO disconnect ${{ connectedSockets }} FROM roomID=${roomID}`,
        );

        await Promise.all(
            [...connectedSockets].map(
                async (socketID) =>
                    await adapter
                        .remoteLeave(socketID, roomID)
                        .catch(() =>
                            console.error(
                                `socket ${socketID} couldn't leave room ${roomID}`,
                            ),
                        ),
            ),
        );
    }

    /**
     * This function will return some context from given socket connection
     */
    public static async getSocketConnectionCredentials(
        socket: TypedSocket,
    ): Promise<{ mtvRoomID?: string; user: User; deviceID: string }> {
        const device = await Device.findByOrFail('socket_id', socket.id);
        await device.load('user');
        if (device.user === null) {
            throw new Error(
                `Device should always have a user relationship deviceID = ${device.uuid}`,
            );
        }
        const user = device.user;
        const mtvRoomID = device.user.mtvRoomID ?? undefined;

        /**
         * Implicit socket io instance auth
         * If a user has a mtvRoomID, socket connection going through this function
         * should be found in the room's connectedSockets
         */
        if (mtvRoomID !== undefined) {
            const connectedSocketsInRoomID =
                await this.getConnectedSocketToRoom(mtvRoomID);
            if (!connectedSocketsInRoomID.has(socket.id)) {
                throw new Error(
                    'Device should appears in the socket io room too, sync error',
                );
            }
        }

        return {
            user,
            mtvRoomID,
            deviceID: device.uuid,
        };
    }

    public static async ownerLeavesRoom(ownedRoom: MtvRoom): Promise<void> {
        await ownedRoom.delete();

        Ws.io.in(ownedRoom.uuid).emit('MTV_FORCED_DISCONNECTION');
        await this.deleteSocketIoRoom(ownedRoom.uuid);

        try {
            console.log(
                `Sending terminate signal to temporal for room ${ownedRoom.uuid}`,
            );
            await MtvRoomsWsController.onTerminate({
                roomID: ownedRoom.uuid,
                runID: ownedRoom.runID,
            });
        } catch (e) {
            console.error(
                `Couldnt terminate workflow on owner disconnection ${ownedRoom.creator.uuid} room: ${ownedRoom.uuid} workflow is still alive in temporal but removed from database and socket io instance`,
                e,
            );
        }
    }
}
