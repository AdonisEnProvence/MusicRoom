import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';

export default class TemporalToServerController {
    public static pause({ request }: HttpContextContract): void {
        const roomID = request.param('roomID');
        Ws.io.to(roomID).emit('PLAY');
    }

    public static play({ request }: HttpContextContract): void {
        const roomID = request.param('roomID');
        Ws.io.to(roomID).emit('PLAY');
    }

    public static join({ request }: HttpContextContract): void {
        const roomID = request.param('roomID');
        const userID = request.param('userID');
        console.log('SUCCESS:', roomID, userID);
        //TODO store socketID[] per userID in redis ?
        Ws.io.emit('JOIN_ROOM_CALLBACK', roomID);
    }
}
