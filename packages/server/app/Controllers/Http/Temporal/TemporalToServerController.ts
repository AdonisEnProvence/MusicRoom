import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { MtvWorkflowState } from '@musicroom/types';
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

    public async mtvCreationAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowState.parse(request.body());

        Ws.io.to(state.roomID).emit('CREATE_ROOM_CALLBACK', state);
    }

    public async join({ request }: HttpContextContract): Promise<void> {
        const { state, joiningUserID } = TemporalToServerJoinBody.parse(
            request.body(),
        );
        const { roomID } = state;

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
    }

    public async mtvChangeUserEmittingDeviceAcknowledgement({
        request,
    }: HttpContextContract): Promise<void> {
        const state = MtvWorkflowState.parse(request.body());

        if (state.UserRelatedInformation === null)
            throw new Error(
                'Error on temporal response for mtvChangeUserEmittingDeviceAcknowledgement userRelatedInformations shouldnt be null',
            );

        await UserService.emitEventInEveryDeviceUser(
            state.UserRelatedInformation.userID,
            'CHANGE_EMITTING_DEVICE_CALLBACK',
            [state],
        );
    }
}
