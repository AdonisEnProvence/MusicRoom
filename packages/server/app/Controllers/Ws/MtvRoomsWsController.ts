import {
    CreateWorkflowResponse,
    MtvRoomClientToServerCreate,
    MtvWorkflowState,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import Ws from 'App/Services/Ws';
import { randomUUID } from 'crypto';
import ServerToTemporalController from '../Http/Temporal/ServerToTemporalController';

// interface WsControllerMethodArgs<Payload> {
//     socket: Socket<MtvRoomClientToServerEvents>;
//     payload: Payload;
// }

interface UserID {
    userID: string;
}

interface RoomID {
    roomID: string;
}

interface DeviceID {
    deviceID: string;
}

interface OnCreateArgs extends UserID, MtvRoomClientToServerCreate, DeviceID {}
interface OnJoinArgs extends UserID, RoomID, DeviceID {}
interface OnPauseArgs extends RoomID {}
interface OnPlayArgs extends RoomID {}
interface OnTerminateArgs extends RoomID {}
interface OnGetStateArgs extends RoomID, UserID {}
interface OnGoToNextTrackArgs extends RoomID {}
interface OnChangeEmittingDeviceArgs extends RoomID, DeviceID, UserID {}

export default class MtvRoomsWsController {
    public static async onCreate({
        initialTracksIDs,
        name,
        userID,
        deviceID,
    }: OnCreateArgs): Promise<CreateWorkflowResponse> {
        const roomID = randomUUID();
        const room = new MtvRoom();
        let roomHasBeenSaved = false;
        console.log(`USER ${userID} CREATE_ROOM ${roomID}`);

        /**
         * We need to create the room before the workflow
         * because we don't know if temporal will answer faster
         * than adonis will execute this function
         */
        const roomCreator = await User.findOrFail(userID);
        await UserService.joinEveryUserDevicesToRoom(roomCreator, roomID);

        try {
            const temporalResponse =
                await ServerToTemporalController.createMtvWorkflow({
                    workflowID: roomID,
                    roomName: name,
                    userID: userID,
                    initialTracksIDs: initialTracksIDs,
                    deviceID,
                });

            await room
                .fill({
                    uuid: roomID,
                    runID: temporalResponse.runID,
                    creator: userID,
                })
                .save();
            roomHasBeenSaved = true;

            await roomCreator.merge({ mtvRoomID: roomID }).save();
            await room.related('members').save(roomCreator);
            console.log('created room ' + roomID);

            return temporalResponse;
        } catch (error) {
            await SocketLifecycle.deleteRoom(roomID);
            if (roomHasBeenSaved) await room.delete();

            throw error;
        }
    }

    public static async onJoin({
        userID,
        roomID,
        deviceID,
    }: OnJoinArgs): Promise<void> {
        const room = await MtvRoom.findOrFail(roomID);

        const roomDoesntExistInAnyNodes = !(await Ws.adapter().allRooms()).has(
            roomID,
        );
        if (roomDoesntExistInAnyNodes) {
            throw new Error(
                'Room does not exist in any socket io server instance ' +
                    roomID,
            );
        }

        console.log(`USER ${userID} JOINS ${roomID}`);
        await ServerToTemporalController.joinWorkflow({
            workflowID: roomID,
            runID: room.runID,
            userID,
            deviceID,
        });
    }

    public static async onPause({ roomID }: OnPauseArgs): Promise<void> {
        console.log(`PAUSE ${roomID}`);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.pause({ workflowID: roomID, runID });
    }

    public static async onPlay({ roomID }: OnPlayArgs): Promise<void> {
        console.log(`PLAY ${roomID} `);
        const { runID } = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.play({ workflowID: roomID, runID });
    }

    /**
     * In this function we do three operations that can fail for an infinite number of reasons.
     * The problem is that they are all necessary to keep consistence of our data.
     * Using a Temporal Workflow would ease dealing with failure.
     *
     * See https://github.com/AdonisEnProvence/MusicRoom/issues/49
     */
    public static async onTerminate({
        roomID,
    }: OnTerminateArgs): Promise<void> {
        console.log(`TERMINATE ${roomID}`);
        const room = await MtvRoom.findOrFail(roomID);
        await ServerToTemporalController.terminateWorkflow({
            workflowID: roomID,
            runID: room.runID,
        });
        await room.delete();
    }

    public static async onGetState({
        roomID,
        userID,
    }: OnGetStateArgs): Promise<MtvWorkflowState> {
        const room = await MtvRoom.findOrFail(roomID);
        return await ServerToTemporalController.getState({
            workflowID: roomID,
            runID: room.runID,
            userID,
        });
    }

    public static async onGoToNextTrack({
        roomID,
    }: OnGoToNextTrackArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.goToNextTrack({
            workflowID: roomID,
            runID,
        });
    }

    public static async OnChangeEmittingDevice({
        deviceID,
        roomID,
        userID,
    }: OnChangeEmittingDeviceArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.ChangeUserEmittingDevice({
            workflowID: roomID,
            runID,
            deviceID,
            userID,
        });
    }
}
