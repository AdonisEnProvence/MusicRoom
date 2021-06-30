import {
    AppMusicPlayerMachineContext,
    CreateWorkflowResponse,
    RoomClientToServerCreate,
    RoomClientToServerEvents,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
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

export default class MtvRoomsWsController {
    public static async onCreate({
        payload,
    }: WsControllerMethodArgs<
        RoomClientToServerCreate & UserID
    >): Promise<CreateWorkflowResponse> {
        console.log('Creating room' + payload.name);
        const roomID = randomUUID();
        const res = await ServerToTemporalController.createWorflow(
            roomID,
            payload.name,
            payload.userID,
        );
        const roomCreator = await User.findOrFail(payload.userID);
        await roomCreator.load('devices');
        await Promise.all(
            roomCreator.devices.map(async (device) => {
                console.log('connecting device ', device.uuid);
                await Ws.adapter().remoteJoin(device.socketID, roomID);
            }),
        );
        const room = await MtvRoom.create({
            uuid: roomID,
            runID: res.runID,
            creator: payload.userID,
        });
        await room.related('creatorRef').associate(roomCreator);
        console.log(`created room ${roomID}`);
        return res;
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
        await joiningUser.related('mtvRoom').save(room);
        await joiningUser.load('devices');
        await Promise.all(
            joiningUser.devices.map(async (device) => {
                console.log('JOIN connecting device ', device.uuid);
                await Ws.adapter().remoteJoin(device.socketID, roomID);
            }),
        );
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
}
