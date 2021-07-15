import {
    AppMusicPlayerMachineContext,
    CreateWorkflowResponse,
    RoomClientToServerCreate,
    RoomClientToServerEvents,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import ServerToTemporalController from '../Http/Temporal/ServerToTemporalController';

interface WsControllerMethodArgs<Payload> {
    socket: Socket<RoomClientToServerEvents>; //RoomServerToClientEvents
    payload: Payload;
}

interface UserID {
    userID: string;
}

interface RoomID {
    roomID: string;
}

type Credentials = RoomID & UserID;

async function joinEveryUserDevicesToRoom(user: User, roomID: string) {
    await user.load('devices');
    await Promise.all(
        user.devices.map(async (device) => {
            console.log('connecting device ', device.socketID);
            await Ws.adapter().remoteJoin(device.socketID, roomID);
        }),
    );
}

export default class MtvRoomsWsController {
    public static async onCreate({
        payload,
    }: WsControllerMethodArgs<
        RoomClientToServerCreate & UserID
    >): Promise<CreateWorkflowResponse> {
        const roomID = randomUUID();
        const room = new MtvRoom();
        let roomHasBeenSaved = false;
        console.log(`USER ${payload.userID} CREATE_ROOM ${roomID}`);

        /**
         * We need to create the room before the workflow
         * because we don't know if temporal will answer faster
         * than adonis will execute this function
         */
        const roomCreator = await User.findOrFail(payload.userID);
        await joinEveryUserDevicesToRoom(roomCreator, roomID);

        try {
            const temporalResponse =
                await ServerToTemporalController.createMtvWorkflow({
                    workflowID: roomID,
                    roomName: payload.name,
                    userID: payload.userID,
                    initialTracksIDs: payload.initialTracksIDs,
                });

            await room
                .fill({
                    uuid: roomID,
                    runID: temporalResponse.runID,
                    creator: payload.userID,
                })
                .save();
            roomHasBeenSaved = true;

            await roomCreator.merge({ mtvRoomID: roomID }).save();
            await room.related('members').save(roomCreator);
            console.log('created room ' + roomID);

            return temporalResponse;
        } catch (error) {
            await SocketLifecycle.deleteRoom(roomID);
            if (roomHasBeenSaved) await room.delete();

            throw error;
        }
    }

    public static async onJoin({
        payload,
    }: WsControllerMethodArgs<Credentials>): Promise<void> {
        const { roomID, userID } = payload;
        const room = await MtvRoom.findOrFail(roomID);
        const joiningUser = await User.findOrFail(payload.userID);
        const roomDoesntExistInAnyNodes = !(await Ws.adapter().allRooms()).has(
            roomID,
        );

        if (roomDoesntExistInAnyNodes) {
            throw new Error(
                'Room does not exist in any socket io server instance ' +
                    roomID,
            );
        }

        console.log(`USER ${payload.userID} JOINS ${roomID}`);
        await ServerToTemporalController.joinWorkflow(
            roomID,
            room.runID,
            userID,
        );

        await joinEveryUserDevicesToRoom(joiningUser, roomID);

        joiningUser.mtvRoomID = roomID;
        await joiningUser.save();
        await joiningUser.related('mtvRoom').associate(room);
        console.log('in array', await Ws.adapter().sockets(new Set([roomID])));
    }

    public static async onPause({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomID>): Promise<void> {
        const { roomID } = payload;
        console.log(`PAUSE ${roomID} with ${socket.id}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.pause(roomID, runID);
    }

    public static async onPlay({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomID>): Promise<void> {
        const { roomID } = payload;
        console.log(`PLAY ${payload.roomID} with ${socket.id}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.play(roomID, runID);
    }

    /**
     * In this function we do three operations that can fail for an infinite number of reasons.
     * The problem is that they are all necessary to keep consistence of our data.
     * Using a Temporal Workflow would ease dealing with failure.
     *
     * See https://github.com/AdonisEnProvence/MusicRoom/issues/49
     */
    public static async onTerminate(roomID: string): Promise<void> {
        console.log(`TERMINATE ${roomID}`);
        const room = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.terminateWorkflow(roomID, room.runID);
        await room.delete();
    }

    public static async onGetState(
        roomID: string,
    ): Promise<AppMusicPlayerMachineContext> {
        const room = await MtvRoom.findOrFail(roomID);
        return await ServerToTemporalController.getState(roomID, room.runID);
    }

    public static async onGoToNextTrack({
        payload: { roomID },
    }: WsControllerMethodArgs<RoomID>): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.goToNextTrack({
            workflowID: roomID,
            runID,
        });
    }
}
