import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';
import * as z from 'zod';
import { MtvWorkflowState } from '@musicroom/types';

const TemporalToServerMtvCreationAcknowledgement = z.object({
    userID: z.string().uuid(),
    roomID: z.string().uuid(),
    state: MtvWorkflowState,
});
type TemporalToServerMtvCreationAcknowledgement = z.infer<
    typeof TemporalToServerMtvCreationAcknowledgement
>;

const TemporalToServeJoinBody = z.object({
    userID: z.string().uuid(),
    roomID: z.string().uuid(),
    state: MtvWorkflowState,
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

    public mtvCreationAcknowledgement({ request }: HttpContextContract): void {
        const {
            roomID,
            state: { name: roomName, tracks },
        } = TemporalToServerMtvCreationAcknowledgement.parse(request.body());

        Ws.io.emit('CREATE_ROOM_CALLBACK', { roomID, roomName, tracks });
    }

    public join({ request }: HttpContextContract): void {
        const {
            roomID,
            state: { name: roomName, tracks },
        } = TemporalToServeJoinBody.parse(request.body());

        Ws.io.emit('JOIN_ROOM_CALLBACK', {
            roomID,
            roomName,
            tracks,
        });
    }
}
