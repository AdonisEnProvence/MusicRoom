import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';
import * as z from 'zod';
const TemporalToServeJoinBody = z.object({
    state: z.object({
        playing: z.boolean(),
        name: z.string(),
        users: z.array(z.string()),
    }),
});

type TemporalToServeJoinBody = z.infer<typeof TemporalToServeJoinBody>;

export default class TemporalToServerController {
    public pause({ request }: HttpContextContract): void {
        console.log('TEMPORAL SENT PAUSE');
        const roomID = decodeURIComponent(request.param('roomID'));
        Ws.io.to(roomID).emit('ACTION_PAUSE_CALLBACK');
    }

    public play({ request }: HttpContextContract): void {
        console.log('TEMPORAL SENT PLAY');
        const roomID = decodeURIComponent(request.param('roomID'));
        Ws.io.to(roomID).emit('ACTION_PLAY_CALLBACK');
    }

    public join({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));
        const userID = decodeURIComponent(request.param('userID'));
        const body = TemporalToServeJoinBody.parse(request.body());
        console.log('SUCCESS:', roomID, userID, body);
        //TODO store socketID[] per userID in redis ?
        Ws.io.emit('JOIN_ROOM_CALLBACK', { roomID, name: body.state.name });
    }
}
