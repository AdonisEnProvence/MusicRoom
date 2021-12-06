import { MpeRoomClientToServerCreateArgs } from '@musicroom/types/dist/mpe-room-websockets';
import MpeRoomsWsController from 'App/Controllers/Ws/MpeRoomsWsController';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import { TypedSocket } from './socket';

export default function initMpeSocketEventListeners(socket: TypedSocket): void {
    socket.on('MPE_CREATE_ROOM', async (args) => {
        try {
            MpeRoomClientToServerCreateArgs.parse(args);

            const { user } =
                await SocketLifecycle.getSocketConnectionCredentials(socket);

            const response = await MpeRoomsWsController.onCreate({
                ...args,
                roomCreator: user,
            });

            socket
                .to(response.workflowID)
                .emit('MPE_CREATE_ROOM_SYNCED_CALLBACK', response.state);
        } catch (e) {
            console.error(e);
            socket.emit('MPE_CREATE_ROOM_FAIL');
        }
    });
}
