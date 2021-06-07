import {
    RoomClientToServerCreate,
    RoomClientToServerEvents,
    RoomClientToServerJoin,
} from '@musicroom/types';
import { Socket } from 'socket.io';
import ServerToTemporalController from '../Temporal/ServerToTemporalController';

//TODO replace by uid generator lib
const genId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
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
            await ServerToTemporalController.createWorflow(roomID);
        } catch (e) {
            console.log('failed to create room', e);
        }
    }

    public static onJoin({
        socket,
        payload,
    }: WsControllerMethodArgs<RoomClientToServerJoin>): void {
        console.log(
            `User ${payload.userID} wanna join ${payload.roomID} with ${socket.id}`,
        );
    }
}
