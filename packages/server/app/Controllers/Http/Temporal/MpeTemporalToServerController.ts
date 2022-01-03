import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    MpeRejectAddingTracksRequestBody,
    MpeWorkflowState,
    MpeAcknowledgeAddingTracksRequestBody,
    MpeRejectChangeTrackOrderRequestBody,
    MpeAcknowledgeChangeTrackOrderRequestBody,
    MpeAcknowledgeDeletingTracksRequestBody,
    MpeAcknowledgeJoinRequestBody,
} from '@musicroom/types';
import Device from 'App/Models/Device';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import Ws from 'App/Services/Ws';

export default class MpeTemporalToServerController {
    public async mpeCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        console.log('RECEIVED MPE ROOM CREATION ACKNOWLEDGEMENT');
        const state = MpeWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('MPE_CREATE_ROOM_CALLBACK', state);
    }

    public async mpeJoinAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        console.log('RECEIVED MPE JOIN ROOM ACK');

        const { state, joiningUserID } = MpeAcknowledgeJoinRequestBody.parse(
            request.body(),
        );
        const { roomID } = state;

        const joiningUser = await User.findOrFail(joiningUserID);
        const mpeRoom = await MpeRoom.findOrFail(roomID);

        await UserService.joinEveryUserDevicesToRoom(joiningUser, roomID);

        await joiningUser.related('mpeRooms').save(mpeRoom);

        await UserService.emitEventInEveryDeviceUser(
            joiningUserID,
            'MPE_JOIN_ROOM_CALLBACK',
            [
                {
                    roomID,
                    state,
                    userIsNotInRoom: false,
                },
            ],
        );

        Ws.io.to(roomID).emit('MPE_USERS_LENGTH_UPDATE', {
            state,
            roomID,
        });
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

    public async changeTrackOrderAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const { state, deviceID } =
            MpeAcknowledgeChangeTrackOrderRequestBody.parse(request.body());

        const device = await Device.findOrFail(deviceID);
        Ws.io
            .to(device.socketID)
            .emit('MPE_CHANGE_TRACK_ORDER_SUCCESS_CALLBACK', {
                roomID: state.roomID,
                state,
            });

        Ws.io
            .to(state.roomID)
            .except(device.socketID)
            .emit('MPE_TRACKS_LIST_UPDATE', { roomID: state.roomID, state });
    }

    public async changeTrackOrderRejection({
        request,
    }: HttpContextContract): Promise<void> {
        const { deviceID, roomID } = MpeRejectChangeTrackOrderRequestBody.parse(
            request.body(),
        );

        const device = await Device.findOrFail(deviceID);
        Ws.io.to(device.socketID).emit('MPE_CHANGE_TRACK_ORDER_FAIL_CALLBACK', {
            roomID,
        });
    }

    public async deleteTracksAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const { state, deviceID } =
            MpeAcknowledgeDeletingTracksRequestBody.parse(request.body());

        const device = await Device.findOrFail(deviceID);

        Ws.io.to(device.socketID).emit('MPE_DELETE_TRACKS_SUCCESS_CALLBACK', {
            roomID: state.roomID,
            state,
        });

        Ws.io
            .to(state.roomID)
            .except(device.socketID)
            .emit('MPE_TRACKS_LIST_UPDATE', { roomID: state.roomID, state });
    }
}
