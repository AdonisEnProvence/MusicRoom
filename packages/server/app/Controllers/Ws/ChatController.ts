// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import * as z from 'zod';

interface WsControllerMethodArgs {
    socket: Socket;
    data: unknown;
}

const ChatMessage = z.object({
    author: z.string(),
    text: z.string(),
});
type ChatMessage = z.infer<typeof ChatMessage>;

const messages: ChatMessage[] = [
    {
        author: 'Baptiste Devessier',
        text: 'Hey all!',
    },
];

export default class ChatController {
    public onConnect(
        this: ChatController,
        { socket }: WsControllerMethodArgs,
    ): void {
        console.log('new connection');

        socket.emit('loadMessages', { messages });
    }

    public onWriteMessage(
        this: ChatController,
        { data }: WsControllerMethodArgs,
    ): void {
        const { message } = z
            .object({
                message: z.string(),
            })
            .parse(data);

        const newChatMessage: ChatMessage = {
            author: 'Baptiste Devessier',
            text: message,
        };

        console.log('add message and broadcast it');

        messages.push(newChatMessage);

        Ws.io.emit('receivedMessage', newChatMessage);
    }
}
