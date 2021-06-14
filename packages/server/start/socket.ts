import ChatController from 'App/Controllers/Ws/ChatController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Ws from 'App/Services/Ws';

Ws.boot();

//TODO SECURE ROOM CALL
// const roomAuth = (socketID: string, roomID: string | undefined) => {
//     if (!roomID) {
//         console.error('ROOMID REQUIRED 404');
//         return false;
//     }
//     if (!Ws.io.sockets.adapter.rooms[roomID].sockets[socketID]) {
//         console.error('UNAUTH 403');
//         return false;
//     }
//     return true;
// };

Ws.io.on('connection', (socket) => {
    ChatController.onConnect({ socket, payload: undefined });

    socket.on('NEW_MESSAGE', (payload) => {
        ChatController.onWriteMessage({ socket, payload });
    });

    /// ROOM ///
    socket.on('CREATE_ROOM', async (payload, callback) => {
        try {
            const { workflowID, state } = await MtvRoomsWsController.onCreate({
                socket,
                payload,
            });
            callback(workflowID, state.name);
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('JOIN_ROOM', async (payload) => {
        try {
            await MtvRoomsWsController.onJoin({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('ACTION_PLAY', async (payload) => {
        try {
            //we need to check auth from socket id into a userId into a room users[]
            await MtvRoomsWsController.onPlay({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('ACTION_PAUSE', async (payload) => {
        try {
            await MtvRoomsWsController.onPause({ socket, payload });
        } catch (e) {
            console.error(e);
        }
    });
    /// //// ///
});
