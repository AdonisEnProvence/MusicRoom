import Env from '@ioc:Adonis/Core/Env';
import AdonisServer from '@ioc:Adonis/Core/Server';
import {
    AllClientToServerEvents,
    AllServerToClientEvents,
} from '@musicroom/types';
import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import Device from 'App/Models/Device';
import { RedisClient } from 'redis';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

class Ws {
    public io: Server<AllClientToServerEvents, AllServerToClientEvents>;
    private booted = false;

    public boot() {
        if (this.booted === true) {
            return;
        }
        this.booted = true;
        this.io = new Server(AdonisServer.instance, {
            cors: {
                origin: true,
                credentials: true,
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
        this.io.adapter(createAdapter(pubClient, subClient) as any);
    }
    public adapter(namespace?: string): RedisAdapter {
        return this.io.of(namespace ?? '/').adapter as unknown as RedisAdapter;
    }
}

const WsSingleton = new Ws();

export type TypedSocket = Socket<
    AllClientToServerEvents,
    AllServerToClientEvents,
    DefaultEventsMap
>;

/**
 * Make the given socket joins the given mtvRoomID
 * @param socketID socketID to sync
 * @param roomID room whom to be sync with
 */
export async function remoteJoinSocketIoRoom(
    socketID: string,
    roomID: string,
): Promise<void> {
    try {
        const adapter = WsSingleton.adapter();
        await adapter.remoteJoin(socketID, roomID);
    } catch (e) {
        const zombieDevice = await Device.findBy('socket_id', socketID);
        if (zombieDevice) {
            await zombieDevice.delete();
        }

        console.error(e);
    }
}

export default WsSingleton;
