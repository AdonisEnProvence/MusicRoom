import Redis from '@ioc:Adonis/Addons/Redis';
import {
    RoomClientToServerCreate,
    RoomClientToServerEvents,
    RoomClientToServerJoin,
    RoomClientToServerPause,
    RoomClientToServerPlay,
} from '@musicroom/types';
import { Socket } from 'socket.io';
import ServerToTemporalController from '../Temporal/ServerToTemporalController';

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

export default class RoomController {
    public static async onCreate({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerCreate>): Promise<void> {
        try {
            console.log('Creating room' + payload.name);
            const roomID = genId();
            await socket.join(roomID);
            const { runID } = await ServerToTemporalController.createWorflow(
                roomID,
                payload.name,
            );
            await Redis.set(roomID, runID);
        } catch (e) {
            throw new Error('failed to create room');
        }
    }

    public static async onJoin({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerJoin>): Promise<void> {
        try {
            const { roomID, userID } = payload;
            console.log(`JOIN ${roomID} with ${socket.id}`);
            const runID = await getRunID(roomID);
            await ServerToTemporalController.joinWorkflow(
                roomID,
                runID,
                userID,
            );
        } catch (e) {
            throw new Error('failed on JOIN attempt');
        }
    }

    public static async onPause({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPause>): Promise<void> {
        try {
            const { roomID, userID } = payload;
            console.log(`PAUSE ${roomID} with ${socket.id}`);
            const runID = await getRunID(roomID);
            await ServerToTemporalController.pause(roomID, runID, userID);
        } catch (e) {
            throw new Error('failed on PAUSE_ACTION attempt');
        }
    }

    public static async onPlay({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerPlay>): Promise<void> {
        try {
            const { roomID, userID } = payload;
            console.log(`PLAY ${payload.roomID} with ${socket.id}`);
            const runID = await getRunID(roomID);
            await ServerToTemporalController.play(roomID, runID, userID);
        } catch (e) {
            throw new Error('failed on PLAY_ACTION attempt');
        }
    }
}
