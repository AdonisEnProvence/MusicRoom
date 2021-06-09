import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';

export default class TemporalToServerController {
    public pause({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));
        Ws.io.to(roomID).emit('PLAY');
    }

    public play({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));
        Ws.io.to(roomID).emit('PLAY');
    }

    public join({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));
        const userID = decodeURIComponent(request.param('userID'));
        const body = request.body();
        console.log('SUCCESS:', roomID, userID, body);
        //TODO store socketID[] per userID in redis ?
        // Ws.io.emit('JOIN_ROOM_CALLBACK', { roomID, name:  });
    }
}
