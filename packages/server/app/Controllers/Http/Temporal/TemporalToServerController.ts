import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Ws from 'App/Services/Ws';
import * as z from 'zod';

const ISO8601Duration = z
    .string()
    .refine((duration) => duration.startsWith('P'), {
        message: 'ISO8601 duration must begin with P',
    });

const TracksMetadata = z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    duration: ISO8601Duration,
});
type TracksMetadata = z.infer<typeof TracksMetadata>;

const MtvWorkflowState = z
    .object({
        playing: z.boolean(),
        name: z.string(),
        users: z.array(z.string()),
        tracks: z.array(TracksMetadata),
    })
    .nonstrict();
type MtvWorkflowState = z.infer<typeof MtvWorkflowState>;

const TemporalToServerMtvCreationAcknowledgement = z.object({
    userID: z.string().uuid(),
    roomID: z.string().uuid(),
    state: MtvWorkflowState,
});
type TemporalToServerMtvCreationAcknowledgement = z.infer<
    typeof TemporalToServerMtvCreationAcknowledgement
>;

const TemporalToServeJoinBody = z.object({
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
        console.log('mtv creation ack', request.body());

        const {
            roomID,
            userID,
            state: { name: roomName },
        } = TemporalToServerMtvCreationAcknowledgement.parse(request.body());

        Ws.io.emit('CREATE_ROOM_CALLBACK', { roomID, roomName });
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
