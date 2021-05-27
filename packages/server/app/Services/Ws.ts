import { Server } from 'socket.io';
import AdonisServer from '@ioc:Adonis/Core/Server';

class Ws {
    public io: Server;
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
