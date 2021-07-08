import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { MtvWorkflowState } from '@musicroom/types';
import Ws from 'App/Services/Ws';
import * as z from 'zod';

const TemporalToServerMtvCreationAcknowledgement = MtvWorkflowState;
type TemporalToServerMtvCreationAcknowledgement = z.infer<
    typeof TemporalToServerMtvCreationAcknowledgement
>;

const TemporalToServeJoinBody = MtvWorkflowState;
type TemporalToServeJoinBody = z.infer<typeof TemporalToServeJoinBody>;

export default class TemporalToServerController {
    public pause({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));

        Ws.io.to(roomID).emit('ACTION_PAUSE_CALLBACK');
    }

    public play({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));

        Ws.io.to(roomID).emit('ACTION_PLAY_CALLBACK');
    }

    public async mtvCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = TemporalToServerMtvCreationAcknowledgement.parse(
            request.body(),
        );

        Ws.io.to(state.roomID).emit('CREATE_ROOM_CALLBACK', state);
    }

    public join({ request }: HttpContextContract): void {
        const {
            roomID,
            name: roomName,
            tracks,
        } = TemporalToServeJoinBody.parse(request.body());

        //vomiting to refacto
        Ws.io.emit('JOIN_ROOM_CALLBACK', {
            roomID,
            roomName,
            tracks,
        });
    }
}
