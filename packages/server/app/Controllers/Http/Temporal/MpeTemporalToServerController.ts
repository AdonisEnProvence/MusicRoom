import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { MpeWorkflowState } from '@musicroom/types';
import Ws from 'App/Services/Ws';

export default class MpeTemporalToServerController {
    public async mpeCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        console.log('RECEIVED MPE ROOM CREATION ACKNOWLEDGEMENT');
        const state = MpeWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('MPE_CREATE_ROOM_CALLBACK', state);
    }
}
