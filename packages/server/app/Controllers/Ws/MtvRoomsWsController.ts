import {
    CreateWorkflowResponse,
    RoomClientToServerCreate,
    RoomClientToServerEvents,
    RoomClientToServerJoin,
    RoomClientToServerPause,
    RoomClientToServerPlay,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import Ws from 'App/Services/Ws';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import ServerToTemporalController from '../Http/Temporal/ServerToTemporalController';

interface WsControllerMethodArgs<Payload> {
    socket: Socket<RoomClientToServerEvents>; //RoomServerToClientEvents
    payload: Payload;
}

export default class MtvRoomsWsController {
    public static async onCreate({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerCreate>): Promise<CreateWorkflowResponse> {
        console.log('Creating room' + payload.name);
        const roomID = randomUUID();
        const res = await ServerToTemporalController.createWorflow(
            roomID,
            payload.name,
            payload.userID,
        );
        await socket.join(roomID);
        console.log('in array', await Ws.adapter().sockets(new Set([roomID])));
        await MtvRoom.create({
            uuid: roomID,
            runID: res.runID,
            creator: payload.userID,
        });
        return res;
    }

    public static async onJoin({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerJoin>): Promise<void> {
        const { roomID, userID } = payload;
        if (!Ws.io.sockets.adapter.rooms.has(roomID))
            throw new Error('Room does not exist ' + roomID);
        console.log(`JOIN ${roomID} with ${socket.id}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.joinWorkflow(roomID, runID, userID);
        await socket.join(roomID);
        console.log('in array', await Ws.adapter().sockets(new Set([roomID])));
    }

    public static async onPause({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPause>): Promise<void> {
        const { roomID } = payload;
        console.log(`PAUSE ${roomID} with ${socket.id}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.pause(roomID, runID);
    }

    public static async onPlay({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPlay>): Promise<void> {
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
    public static async onTerminate({
        payload,
    }: WsControllerMethodArgs<{ roomID: string }>): Promise<void> {
        const { roomID } = payload;
        console.log(`TERMINATE ${payload.roomID}`);
        const room = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.terminateWorkflow(roomID, room.runID);
        await room.delete();
    }
}
