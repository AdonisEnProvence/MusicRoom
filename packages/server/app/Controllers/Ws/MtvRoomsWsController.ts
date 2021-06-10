import Redis from '@ioc:Adonis/Addons/Redis';
import {
    CreateWorkflowResponse,
    RoomClientToServerCreate,
    RoomClientToServerEvents,
    RoomClientToServerJoin,
    RoomClientToServerPause,
    RoomClientToServerPlay,
} from '@musicroom/types';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import ServerToTemporalController from '../Http/Temporal/ServerToTemporalController';

//TODO replace by uid generator lib
const genId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
};

const getRunID = async (roomID: string): Promise<string> => {
    const runID: string | undefined = (await Redis.get(roomID)) || undefined;
    if (!runID) {
        throw new Error('Redis failed to get runID for ' + roomID);
    }
    return runID;
};

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
        const roomID = genId();
        const res = await ServerToTemporalController.createWorflow(
            roomID,
            payload.name,
            payload.userID,
        );
        await socket.join(roomID);
        await Redis.set(roomID, res.runID);
        console.log('Room created');
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
        const runID = await getRunID(roomID);
        await ServerToTemporalController.joinWorkflow(roomID, runID, userID);
    }

    public static async onPause({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPause>): Promise<void> {
        const { roomID, userID } = payload;
        console.log(`PAUSE ${roomID} with ${socket.id}`);
        const runID = await getRunID(roomID);
        await ServerToTemporalController.pause(roomID, runID, userID);
    }

    public static async onPlay({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPlay>): Promise<void> {
        const { roomID, userID } = payload;
        console.log(`PLAY ${payload.roomID} with ${socket.id}`);
        const runID = await getRunID(roomID);
        await ServerToTemporalController.play(roomID, runID, userID);
    }
}
