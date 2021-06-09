import Env from '@ioc:Adonis/Core/Env';
import AdonisServer from '@ioc:Adonis/Core/Server';
import { AllEvents } from '@musicroom/types/src/websockets';
import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import { RedisClient } from 'redis';
import { Server } from 'socket.io';

class Ws {
    public io: Server<AllEvents>;
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
    public adapter(namespace?: string): RedisAdapter {
        return this.io.of(namespace ?? '/').adapter as RedisAdapter;
    }
}

export default new Ws();
