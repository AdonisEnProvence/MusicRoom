import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
    MtvRoomClientToServerEvents,
    MtvRoomServerToClientEvents,
} from './mtv-room-websockets';
import {
    UserClientToServerEvents,
    UserServerToClientEvents,
} from './user-websockets';

export type AllClientToServerEvents = MtvRoomClientToServerEvents &
    ChatClientToServerEvents &
    UserClientToServerEvents;

export type AllServerToClientEvents = ChatServerToClientEvents &
    MtvRoomServerToClientEvents &
    UserServerToClientEvents;
