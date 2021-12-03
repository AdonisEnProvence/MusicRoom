import { GlobalClientToServerEvents } from './global-websockets';
import {
    MpeRoomClientToServerEvents,
    MpeRoomServerToClientEvents,
} from './mpe-room-websockets';
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
    UserClientToServerEvents &
    GlobalClientToServerEvents &
    MpeRoomClientToServerEvents;

export type AllServerToClientEvents = MtvRoomChatServerToClientEvents &
    MtvRoomServerToClientEvents &
    UserServerToClientEvents &
    MpeRoomServerToClientEvents;
