import Redis from '@ioc:Adonis/Addons/Redis';
import AdonisServer from '@ioc:Adonis/Core/Server';
import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
} from '@musicroom/types';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

class Ws {
    public io: Server<ChatClientToServerEvents, ChatServerToClientEvents>;
    private booted = false;

    public boot() {
        if (this.booted === true) {
            return;
        }
        this.booted = true;
        this.io = new Server(AdonisServer.instance);
        const pubClient = Redis.connection('pub');
        const subClient = Redis.connection('local');
        //For further informations see https://socket.io/docs/v3/using-multiple-nodes/index.html
        this.io.adapter(createAdapter(pubClient, subClient));
    }
}

export default new Ws();
