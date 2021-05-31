import { Server } from 'socket.io';
import AdonisServer from '@ioc:Adonis/Core/Server';
import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
} from '@musicroom/types';

class Ws {
    public io: Server<ChatClientToServerEvents, ChatServerToClientEvents>;
    private booted = false;

    public boot() {
        if (this.booted === true) {
            return;
        }

        this.booted = true;
        this.io = new Server(AdonisServer.instance);
    }
}

export default new Ws();
