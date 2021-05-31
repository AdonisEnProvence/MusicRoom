import {
    ChatMessage,
    ChatClientToServerEvents,
    ChatServerToClientEvents,
    ChatClientToServerNewMessageArgs,
} from '@musicroom/types';
import { Socket } from 'socket.io';
import Ws from 'App/Services/Ws';

interface WsControllerMethodArgs<Payload> {
    socket: Socket<ChatClientToServerEvents, ChatServerToClientEvents>;
    payload: Payload;
}

const messages: ChatMessage[] = [
    {
        author: 'Baptiste Devessier',
        text: 'Hey all!',
    },
];

export default class ChatController {
    public static onConnect({
        socket,
    }: WsControllerMethodArgs<undefined>): void {
        console.log('new connection');

        socket.emit('LOAD_MESSAGES', { messages });
    }

    public static onWriteMessage({
        payload: {
            message: { author, text },
        },
    }: WsControllerMethodArgs<ChatClientToServerNewMessageArgs>): void {
        const newChatMessage: ChatMessage = {
            author,
            text,
        };

        console.log('add message and broadcast it');

        messages.push(newChatMessage);

        Ws.io.emit('RECEIVED_MESSAGE', {
            message: newChatMessage,
        });
    }
}
