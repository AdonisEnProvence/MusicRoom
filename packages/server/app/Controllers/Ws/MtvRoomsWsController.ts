import {
    CreateWorkflowResponse,
    MtvRoomClientToServerCreateArgs,
    MtvWorkflowState,
} from '@musicroom/types';
import MtvRoom from 'App/Models/MtvRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import { randomUUID } from 'crypto';
import ServerToTemporalController from '../Http/Temporal/ServerToTemporalController';

interface UserID {
    userID: string;
}

interface UserArgs {
    user: User;
}

interface RoomID {
    roomID: string;
}

interface DeviceID {
    deviceID: string;
}

interface RunID {
    runID: string;
}

interface OnCreateArgs extends UserID, DeviceID {
    params: MtvRoomClientToServerCreateArgs;
}
interface OnJoinArgs extends UserID, DeviceID {
    joiningRoom: MtvRoom;
}
interface OnLeaveArgs extends UserArgs {
    leavingRoomID: string;
}
interface OnPauseArgs extends RoomID {}
interface OnPlayArgs extends RoomID {}
interface OnTerminateArgs extends RoomID, RunID {}
interface OnGetStateArgs extends RoomID, UserID {}
interface OnGoToNextTrackArgs extends RoomID {}
interface OnChangeEmittingDeviceArgs extends RoomID, DeviceID, UserID {}
interface OnSuggestTracksArgs extends RoomID, DeviceID, UserID {
    tracksToSuggest: string[];
}

interface OnVoteForTrackArgs extends RoomID, UserID {
    trackID: string;
}

export default class MtvRoomsWsController {
    public static async onCreate({
        params,
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
                    userID: userID,
                    deviceID,
                    params,
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
            await SocketLifecycle.deleteSocketIoRoom(roomID);
            if (roomHasBeenSaved) await room.delete();

            throw error;
        }
    }

    public static async onJoin({
        userID,
        joiningRoom: { runID, uuid: roomID },
        deviceID,
    }: OnJoinArgs): Promise<void> {
        console.log(`USER ${userID} JOINS ${roomID}`);

        await ServerToTemporalController.joinWorkflow({
            workflowID: roomID,
            runID: runID,
            userID,
            deviceID,
        });
    }

    public static async onLeave({
        user,
        leavingRoomID,
    }: OnLeaveArgs): Promise<void> {
        const { uuid: userID } = user;
        console.log(`USER ${userID} LEAVES ${leavingRoomID}`);

        const leavingRoom = await MtvRoom.findOrFail(leavingRoomID);
        const { creator, runID } = leavingRoom;

        /**
         * No matter if the leaving user was creator or not
         * We need to disconnect every of his device from the room socket io instance
         * And to dissociate his relationship with the mtvRoom
         */
        await UserService.leaveEveryUserDevicesFromRoom(user, leavingRoomID);
        await user.related('mtvRoom').dissociate();

        /**
         * If the leaving user is the room creator we need
         * to terminate the workflow and forced disconnect
         * every remaining users
         */
        const leavingUserIsTheCreator = userID === creator;
        console.log('LEAVING USER IS THE CREATOR ', leavingUserIsTheCreator);
        if (leavingUserIsTheCreator) {
            await SocketLifecycle.ownerLeavesRoom(leavingRoom);
        } else {
            await ServerToTemporalController.leaveWorkflow({
                workflowID: leavingRoomID,
                runID: runID,
                userID,
            });
        }
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
        runID,
    }: OnTerminateArgs): Promise<void> {
        console.log(`TERMINATE ${roomID}`);
        await ServerToTemporalController.terminateWorkflow({
            workflowID: roomID,
            runID: runID,
        });
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

    public static async onChangeEmittingDevice({
        deviceID,
        roomID,
        userID,
    }: OnChangeEmittingDeviceArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.changeUserEmittingDevice({
            workflowID: roomID,
            runID,
            deviceID,
            userID,
        });
    }

    public static async onTracksSuggestion({
        roomID,
        tracksToSuggest,
        userID,
        deviceID,
    }: OnSuggestTracksArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.suggestTracks({
            workflowID: roomID,
            runID,
            tracksToSuggest,
            userID,
            deviceID,
        });
    }

    public static async voteForTrack({
        roomID,
        trackID,
        userID,
    }: OnVoteForTrackArgs): Promise<void> {
        const { runID } = await MtvRoom.findOrFail(roomID);

        await ServerToTemporalController.voteForTrack({
            workflowID: roomID,
            runID,
            trackID,
            userID,
        });
    }
}
