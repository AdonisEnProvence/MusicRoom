import { MtvWorkflowState } from './mtv';

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

export interface ChatClientToServerEvents {
    NEW_MESSAGE: (args: ChatClientToServerNewMessageArgs) => void;
}

export interface ChatServerToClientEvents {
    LOAD_MESSAGES: (args: ChatServerToClientLoadMessagesArgs) => void;
    RECEIVED_MESSAGE: (args: ChatServerToClientReceivedMessageArgs) => void;
}

export interface MtvRoomClientToServerCreate {
    name: string;
    initialTracksIDs: string[];
}

export interface MtvRoomClientToServerJoin {
    roomID: string;
}

export interface Track {
    name: string;
    artistName: string;
}

export interface MtvRoomClientToServerChangeUserEmittingDevice {
    newEmittingDeviceID: string;
}

export interface MtvRoomClientToServerEvents {
    CREATE_ROOM: (args: MtvRoomClientToServerCreate) => void;
    JOIN_ROOM: (args: MtvRoomClientToServerJoin) => void;
    LEAVE_ROOM: () => void;
    ACTION_PLAY: () => void;
    GET_CONTEXT: () => void;
    ACTION_PAUSE: () => void;
    GO_TO_NEXT_TRACK: () => void;
    CHANGE_EMITTING_DEVICE: (
        args: MtvRoomClientToServerChangeUserEmittingDevice,
    ) => void;
}

export interface MtvRoomServerToClientEvents {
    USER_LENGTH_UPDATE: (state: MtvWorkflowState) => void;
    CREATE_ROOM_SYNCHED_CALLBACK: (state: MtvWorkflowState) => void;
    RETRIEVE_CONTEXT: (state: MtvWorkflowState) => void;
    ACTION_PLAY_CALLBACK: (state: MtvWorkflowState) => void;
    ACTION_PAUSE_CALLBACK: () => void;
    CREATE_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    FORCED_DISCONNECTION: () => void;
    JOIN_ROOM_CALLBACK: (state: MtvWorkflowState) => void;
    CHANGE_EMITTING_DEVICE_CALLBACK: (state: MtvWorkflowState) => void;
}
