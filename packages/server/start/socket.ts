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
    socket.on('CREATE_ROOM', async (payload) => {
        try {
            await RoomController.onCreate({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('JOIN_ROOM', async (payload) => {
        try {
            await RoomController.onJoin({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });

    //AUTH REQUEST
    Ws.io.use((_, next) => {
        const roomID = socket.data.roomID as string | undefined;
        if (!roomID) {
            console.log('ROOMID REQUIRED');
            return;
        }
        if (!Ws.io.sockets.adapter.rooms[roomID].sockets[socket.id]) {
            console.log('UNAUTH');
            return;
        }
        next();
    });

    socket.on('ACTION_PLAY', async (payload) => {
        try {
            await RoomController.onPause({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('ACTION_PAUSE', async (payload) => {
        try {
            await RoomController.onPlay({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });
    /// //// ///
});
