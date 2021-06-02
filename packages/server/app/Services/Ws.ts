import Env from '@ioc:Adonis/Core/Env';
import AdonisServer from '@ioc:Adonis/Core/Server';
import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
} from '@musicroom/types';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisClient } from 'redis';
import { Server } from 'socket.io';

class Ws {
    public io: Server<ChatClientToServerEvents, ChatServerToClientEvents>;
    private booted = false;

    public boot() {
        if (this.booted === true) {
            return;
        }
        this.booted = true;
        this.io = new Server(AdonisServer.instance, {
            cors: {
                origin: '*',
            },
        });
        const pubClient = new RedisClient({
            host: Env.get('REDIS_HOST'),
            port: Env.get('REDIS_PORT'),
            password: Env.get('REDIS_PASSWORD'),
            db: 1,
            prefix: 'pubSub',
        });

        const subClient = pubClient.duplicate();
        //For further informations see https://socket.io/docs/v3/using-multiple-nodes/index.html
        this.io.adapter(createAdapter(pubClient, subClient));
    }
}

export default new Ws();
