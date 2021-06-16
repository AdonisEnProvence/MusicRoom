import {
    CreateWorkflowResponse,
    RoomClientToServerCreate,
    RoomClientToServerEvents,
    RoomClientToServerJoin,
    RoomClientToServerPause,
    RoomClientToServerPlay,
} from '@musicroom/types';
import Room from 'App/Models/Room';
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
        await Ws.adapter().remoteJoin(socket.id, roomID);
        console.log('in array', await Ws.adapter().sockets(new Set([roomID])));
        console.log(
            'withtout array',
            await Ws.adapter().sockets(new Set(roomID)),
        );
        await Room.create({
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
        console.log(Ws.io.sockets.adapter.rooms);
        if (!Ws.io.sockets.adapter.rooms.has(roomID))
            throw new Error('Room does not exist ' + roomID);
        console.log(`JOIN ${roomID} with ${socket.id}`);
        const { runID } = await Room.findOrFail(roomID);
        await ServerToTemporalController.joinWorkflow(roomID, runID, userID);
        await Ws.adapter().remoteJoin(socket.id, roomID);
        console.log('in array', await Ws.adapter().sockets(new Set([roomID])));
        console.log(
            'withtout array',
            await Ws.adapter().sockets(new Set(roomID)),
        );
    }

    public static async onPause({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPause>): Promise<void> {
        const { roomID } = payload;
        console.log(`PAUSE ${roomID} with ${socket.id}`);
        const { runID } = await Room.findOrFail(roomID);
        await ServerToTemporalController.pause(roomID, runID);
    }

    public static async onPlay({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPlay>): Promise<void> {
        const { roomID } = payload;
        console.log(`PLAY ${payload.roomID} with ${socket.id}`);
        const { runID } = await Room.findOrFail(roomID);
        await ServerToTemporalController.play(roomID, runID);
    }

    public static async onTerminate({
        payload,
    }: WsControllerMethodArgs<{ roomID: string }>): Promise<void> {
        const { roomID } = payload;
        console.log(`TERMINATE ${payload.roomID}`);
        const room = await Room.findOrFail(roomID);
        await ServerToTemporalController.terminateWorkflow(roomID, room.runID);
        await room.delete();
    }
}
