import Ws from 'App/Services/Ws';
import ChatController from 'App/Controllers/Ws/ChatController';

Ws.boot();

Ws.io.on('connection', (socket) => {
    ChatController.onConnect({ socket, payload: undefined });

    socket.on('NEW_MESSAGE', (payload) => {
        ChatController.onWriteMessage({ socket, payload });
    });
});
