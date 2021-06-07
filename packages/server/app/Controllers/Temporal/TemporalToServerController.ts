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
}
