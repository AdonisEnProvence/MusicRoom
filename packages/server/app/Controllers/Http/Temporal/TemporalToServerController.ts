import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { MtvWorkflowState } from '@musicroom/types';
import Ws from 'App/Services/Ws';

export default class TemporalToServerController {
    public pause({ request }: HttpContextContract): void {
        const roomID = decodeURIComponent(request.param('roomID'));

        Ws.io.to(roomID).emit('ACTION_PAUSE_CALLBACK');
    }

    public play({ request }: HttpContextContract): void {
        const state = MtvWorkflowState.parse(request.body());
        const roomID = state.roomID;

        console.log('received play from temporal', state);

        Ws.io.to(roomID).emit('ACTION_PLAY_CALLBACK', state);
    }

    public async mtvCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('CREATE_ROOM_CALLBACK', state);
    }

    public join({ request }: HttpContextContract): void {
        const state = MtvWorkflowState.parse(request.body());

        //vomiting to refacto
        Ws.io.emit('JOIN_ROOM_CALLBACK', state);
    }
}
