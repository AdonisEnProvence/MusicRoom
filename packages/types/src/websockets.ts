import { AppMusicPlayerMachineContext } from './appMusicPlayerMachine';

export interface ChatMessage {
    author: string;
    text: string;
}

export interface ChatClientToServerNewMessageArgs {
    message: ChatMessage;
}

export interface ChatServerToClientLoadMessagesArgs {
    messages: ChatMessage[];
}

export interface ChatServerToClientReceivedMessageArgs {
    message: ChatMessage;
}

export interface RoomClientToServerCreate {
    name: string;
    initialTracksIDs: string[];
}

export interface RoomClientToServerJoin {
    roomID: string;
}

export interface Track {
    name: string;
    artistName: string;
}

export type RoomServerToClientJoin = {
    roomID: string;
    name: string;
    // track: Track;
};

export type RoomServerToClientRetrieveContext = {
    context: AppMusicPlayerMachineContext;
};

export interface ChatClientToServerEvents {
    NEW_MESSAGE: (args: ChatClientToServerNewMessageArgs) => void;
}

export interface RoomClientToServerEvents {
    CREATE_ROOM: (
        args: RoomClientToServerCreate,
        callback: (roomID: string, name: string) => void,
    ) => void;
    JOIN_ROOM: (args: RoomClientToServerJoin) => void;
    ACTION_PLAY: () => void;
    GET_CONTEXT: (
        callback: (payload: RoomServerToClientRetrieveContext) => void,
    ) => void;
    ACTION_PAUSE: () => void;
}

export interface RoomServerToClientEvents {
    RETRIEVE_CONTEXT: (args: RoomServerToClientRetrieveContext) => void;
    ACTION_PLAY_CALLBACK: () => void;
    ACTION_PAUSE_CALLBACK: () => void;
    JOIN_ROOM_CALLBACK: (args: RoomServerToClientJoin) => void;
    FORCED_DISCONNECTION: () => void;
}

export interface ChatServerToClientEvents {
    LOAD_MESSAGES: (args: ChatServerToClientLoadMessagesArgs) => void;
    RECEIVED_MESSAGE: (args: ChatServerToClientReceivedMessageArgs) => void;
}

export type AllClientToServerEvents = RoomClientToServerEvents &
    ChatClientToServerEvents;

export type AllServerToClientEvents = ChatServerToClientEvents &
    RoomServerToClientEvents;
