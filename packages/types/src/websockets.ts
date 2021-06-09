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
    userID: string;
}

export interface RoomClientToServerJoin {
    roomID: string;
    userID: string;
}
export type RoomServerToClientJoin = {
    roomID: string;
};
export type RoomClientToServerPause = {
    roomID: string;
    userID: string;
};

export type RoomClientToServerPlay = RoomClientToServerPause;

export interface ChatClientToServerEvents {
    NEW_MESSAGE: (args: ChatClientToServerNewMessageArgs) => void;
}

export interface RoomClientToServerEvents {
    CREATE_ROOM: (
        args: RoomClientToServerCreate,
        callback: (roomID: string, name: string) => void,
    ) => void;
    JOIN_ROOM: (args: RoomClientToServerJoin) => void;
    ACTION_PLAY: (args: RoomClientToServerPlay) => void;
    ACTION_PAUSE: (args: RoomClientToServerPause) => void;
}

export interface RoomServerToClientEvents {
    PLAY: () => void;
    PAUSE: () => void;
    JOIN_ROOM_CALLBACK: (args: RoomServerToClientJoin) => void;
}

export interface ChatServerToClientEvents {
    LOAD_MESSAGES: (args: ChatServerToClientLoadMessagesArgs) => void;
    RECEIVED_MESSAGE: (args: ChatServerToClientReceivedMessageArgs) => void;
}

export type AllEvents = ChatServerToClientEvents &
    RoomClientToServerEvents &
    RoomServerToClientEvents &
    ChatClientToServerEvents;
