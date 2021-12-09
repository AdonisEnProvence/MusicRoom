import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    MpeRejectAddingTracksRequestBody,
    MpeWorkflowState,
    MpeAcknowledgeAddingTracksRequestBody,
} from '@musicroom/types';
import Device from 'App/Models/Device';
import Ws from 'App/Services/Ws';

export default class MpeTemporalToServerController {
    public async mpeCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        console.log('RECEIVED MPE ROOM CREATION ACKNOWLEDGEMENT');
        const state = MpeWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('MPE_CREATE_ROOM_CALLBACK', state);
    }

    public async addingTracksRejection({
        request,
    }: HttpContextContract): Promise<void> {
        const { roomID, deviceID } = MpeRejectAddingTracksRequestBody.parse(
            request.body(),
        );

        const device = await Device.findOrFail(deviceID);

        Ws.io.to(device.socketID).emit('MPE_ADD_TRACKS_FAIL_CALLBACK', {
            roomID,
        });
    }

    public async addingTracksAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const {
            state,
            state: { roomID },
            deviceID,
        } = MpeAcknowledgeAddingTracksRequestBody.parse(request.body());

        const device = await Device.findOrFail(deviceID);

        Ws.io.to(device.socketID).emit('MPE_ADD_TRACKS_SUCCESS_CALLBACK', {
            roomID,
            state,
        });

        Ws.io
            .to(roomID)
            .except(device.socketID)
            .emit('MPE_TRACKS_LIST_UPDATE', {
                roomID,
                state,
            });
    }
}
