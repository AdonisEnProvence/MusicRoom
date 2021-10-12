import {
    MAX_CHAT_MESSAGE_LENGTH,
    MtvRoomChatClientToServerEvents,
    MtvRoomChatClientToServerNewMessageArgs,
    MtvRoomChatServerToClientEvents,
    normalizeChatMessage,
} from '@musicroom/types';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import Ws from 'App/Services/Ws';
import { Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import * as z from 'zod';

interface WsControllerMethodArgs<Payload> {
    socket: Socket<
        MtvRoomChatClientToServerEvents,
        MtvRoomChatServerToClientEvents
    >;
    payload: Payload;
}

export default class MtvRoomsChatController {
    public static async onSendMessage({
        socket,
        payload: { message: rawMessage },
    }: WsControllerMethodArgs<MtvRoomChatClientToServerNewMessageArgs>): Promise<void> {
        const message = z
            .string()
            .nonempty()
            .max(MAX_CHAT_MESSAGE_LENGTH)
            .parse(normalizeChatMessage(rawMessage));

        const {
            mtvRoomID,
            user: { uuid: userID, nickname: userName },
        } = await SocketLifecycle.getSocketConnectionCredentials(socket);
        if (mtvRoomID === undefined) {
            throw new Error('User can not send message if not in a room');
        }

        Ws.io
            .in(mtvRoomID)
            .except(socket.id)
            .emit('RECEIVED_MESSAGE', {
                message: {
                    id: randomUUID(),
                    text: message,
                    authorID: userID,
                    authorName: userName,
                },
            });
    }
}
