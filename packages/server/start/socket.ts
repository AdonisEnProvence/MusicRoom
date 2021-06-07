import ChatController from 'App/Controllers/Ws/ChatController';
import RoomController from 'App/Controllers/Ws/RoomController';
import Ws from 'App/Services/Ws';

Ws.boot();

Ws.io.on('connection', (socket) => {
    ChatController.onConnect({ socket, payload: undefined });

    socket.on('NEW_MESSAGE', (payload) => {
        ChatController.onWriteMessage({ socket, payload });
    });

    /// ROOM ///
    socket.on('CREATE_ROOM', (payload) => {
        RoomController.onCreate({ socket, payload });
    });

    socket.on('JOIN_ROOM', (payload) => {
        RoomController.onJoin({ socket, payload });
    });
    /// //// ///
});
