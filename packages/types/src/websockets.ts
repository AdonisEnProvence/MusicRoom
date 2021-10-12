import {
    MtvRoomChatClientToServerEvents,
    MtvRoomChatServerToClientEvents,
    MtvRoomClientToServerEvents,
    MtvRoomServerToClientEvents,
} from './mtv-room-websockets';
import {
    UserClientToServerEvents,
    UserServerToClientEvents,
} from './user-websockets';

export type AllClientToServerEvents = MtvRoomClientToServerEvents &
    MtvRoomChatClientToServerEvents &
    UserClientToServerEvents;

export type AllServerToClientEvents = MtvRoomChatServerToClientEvents &
    MtvRoomServerToClientEvents &
    UserServerToClientEvents;
