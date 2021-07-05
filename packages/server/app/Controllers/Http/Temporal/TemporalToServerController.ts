import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';
import * as z from 'zod';
import { MtvWorkflowState } from '@musicroom/types';

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

    public mtvCreationAcknowledgement({ request }: HttpContextContract): void {
        const {
            roomID,
            name: roomName,
            tracks,
        } = TemporalToServerMtvCreationAcknowledgement.parse(request.body());

        Ws.io.emit('CREATE_ROOM_CALLBACK', { roomID, roomName, tracks });
    }

    public join({ request }: HttpContextContract): void {
        const {
            roomID,
            name: roomName,
            tracks,
        } = TemporalToServeJoinBody.parse(request.body());

        Ws.io.emit('JOIN_ROOM_CALLBACK', {
            roomID,
            roomName,
            tracks,
        });
    }
}
