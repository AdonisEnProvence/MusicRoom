import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import {
    MtvWorkflowState,
    MtvWorkflowStateWithUserRelatedInformation,
} from '@musicroom/types';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import Device from 'App/Models/Device';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import UserService from 'App/Services/UserService';
import Ws from 'App/Services/Ws';
import * as z from 'zod';

const TemporalToServerJoinBody = z.object({
    joiningUserID: z.string(),
    state: MtvWorkflowState,
});

type TemporalToServerJoinBody = z.infer<typeof TemporalToServerJoinBody>;

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

    public userLengthUpdate({ request }: HttpContextContract): void {
        const state = MtvWorkflowState.parse(request.body());
        const roomID = state.roomID;

        console.log('received userLengthUpdate from temporal', state);

        Ws.io.to(roomID).emit('USER_LENGTH_UPDATE', state);
    }

    public async mtvCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('CREATE_ROOM_CALLBACK', state);
        const creator = await User.findOrFail(state.roomCreatorUserID);

        await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
            creator,
            state.roomID,
        );
    }

    public async join({ request }: HttpContextContract): Promise<void> {
        const { state, joiningUserID } = TemporalToServerJoinBody.parse(
            request.body(),
        );
        const { roomID } = state;

        if (state.userRelatedInformation === null) {
            throw new Error(
                'userRelatedInformation on temporal join callback should not be null',
            );
        }

        const joiningUser = await User.findOrFail(joiningUserID);
        const mtvRoom = await MtvRoom.findOrFail(roomID);

        await UserService.joinEveryUserDevicesToRoom(joiningUser, roomID);

        joiningUser.mtvRoomID = roomID;
        await joiningUser.related('mtvRoom').associate(mtvRoom);
        await joiningUser.save();

        await UserService.emitEventInEveryDeviceUser(
            joiningUserID,
            'JOIN_ROOM_CALLBACK',
            [state],
        );

        await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
            joiningUser,
            roomID,
        );
    }

    public async mtvChangeUserEmittingDeviceAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowState.parse(request.body());

        if (state.userRelatedInformation === null) {
            throw new Error(
                'Error on temporal response for mtvChangeUserEmittingDeviceAcknowledgement userRelatedInformations shouldnt be null',
            );
        }

        const previouslyEmittingDevice =
            await UserService.getUserCurrentlyEmittingDevice(
                state.userRelatedInformation.userID,
            );
        if (previouslyEmittingDevice !== undefined) {
            /**
             * This case won't occurs when an emitting device gets disconnected
             * At the contrary it will on basic emitting device switch
             */
            previouslyEmittingDevice.isEmitting = false;
            await previouslyEmittingDevice.save();
        }

        const emittingDevice = await Device.findOrFail(
            state.userRelatedInformation.emittingDeviceID,
        );
        emittingDevice.isEmitting = true;
        await emittingDevice.save();

        await UserService.emitEventInEveryDeviceUser(
            state.userRelatedInformation.userID,
            'CHANGE_EMITTING_DEVICE_CALLBACK',
            [state],
        );
    }

    public suggestOrVoteTracksListUpdate({
        request,
    }: HttpContextContract): void {
        const state = MtvWorkflowState.parse(request.body());
        const roomID = state.roomID;

        Ws.io.to(roomID).emit('VOTE_OR_SUGGEST_TRACKS_LIST_UPDATE', state);
    }

    public async acknowledgeTracksSuggestion({
        request,
    }: HttpContextContract): Promise<void> {
        const AcknowledgeTracksSuggestionRequestBody = z.object({
            state: MtvWorkflowStateWithUserRelatedInformation,
            deviceID: z.string().uuid(),
        });

        const { deviceID, state } =
            AcknowledgeTracksSuggestionRequestBody.parse(request.body());

        const device = await Device.findOrFail(deviceID);

        Ws.io.in(device.socketID).emit('SUGGEST_TRACKS_CALLBACK');

        await UserService.emitEventInEveryDeviceUser(
            state.userRelatedInformation.userID,
            'VOTE_OR_SUGGEST_TRACK_CALLBACK',
            [state],
        );
    }

    public async acknowledgeTracksSuggestionFail({
        request,
    }: HttpContextContract): Promise<void> {
        const AcknowledgeTracksSuggestionFailRequestBody = z.object({
            deviceID: z.string().uuid(),
        });

        const { deviceID } = AcknowledgeTracksSuggestionFailRequestBody.parse(
            request.body(),
        );

        const device = await Device.findOrFail(deviceID);

        Ws.io.in(device.socketID).emit('SUGGEST_TRACKS_FAIL_CALLBACK');
    }

    public async acknowledgeUserVoteForTrack({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowStateWithUserRelatedInformation.parse(
            request.body(),
        );

        await UserService.emitEventInEveryDeviceUser(
            state.userRelatedInformation.userID,
            'VOTE_OR_SUGGEST_TRACK_CALLBACK',
            [state],
        );
    }

    public acknowledgeUpdateDelegationOwner({
        request,
    }: HttpContextContract): void {
        const state = MtvWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('UPDATE_DELEGATION_OWNER_CALLBACK', state);
    }

    public async acknowledgeUpdateUserFitsPositionConstraint({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowStateWithUserRelatedInformation.parse(
            request.body(),
        );

        await UserService.emitEventInEveryDeviceUser(
            state.userRelatedInformation.userID,
            'USER_PERMISSIONS_UPDATE',
            [state],
        );
    }

    public async acknowledgeUpdateControlAndDelegationPermission({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowStateWithUserRelatedInformation.parse(
            request.body(),
        );

        await UserService.emitEventInEveryDeviceUser(
            state.userRelatedInformation.userID,
            'USER_PERMISSIONS_UPDATE',
            [state],
        );
    }
}
