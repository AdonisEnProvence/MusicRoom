import { randomUUID } from 'crypto';
import {
    MtvCreateWorkflowResponse,
    MtvRoomClientToServerCreateArgs,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
} from '@musicroom/types';
import MtvServerToTemporalController, {
    MtvRoomPhysicalAndTimeConstraintsWithCoords,
} from 'App/Controllers/Http/Temporal/MtvServerToTemporalController';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import User from 'App/Models/User';
import MtvRoom from 'App/Models/MtvRoom';
import Ws from './Ws';
import GeocodingService from './GeocodingService';
import UserService from './UserService';
import SocketLifecycle from './SocketLifecycle';

export class MtvRoomOptionsValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MtvRoomOptionsValidationError';
    }
}

export class MtvRoomOptionsValidationInvalidInvitationOptionError extends MtvRoomOptionsValidationError {
    constructor(message: string) {
        super(message);
        this.name = 'MtvRoomOptionsValidationInvalidInvitationOptionError';
    }
}

export class MtvRoomOptionsValidationInvalidPhysicalAndTimeConstraintsOptionError extends MtvRoomOptionsValidationError {
    constructor(message: string) {
        super(message);
        this.name =
            'MtvRoomOptionsValidationInvalidPhysicalAndTimeConstraintsOptionError';
    }
}

export class MtvRoomOptionsValidationInvalidNameOptionError extends MtvRoomOptionsValidationError {
    constructor(message: string) {
        super(message);
        this.name = 'MtvRoomOptionsValidationInvalidNameOptionError';
    }
}

interface MtvRoomServiceCreateMtvRoomArgs {
    options: MtvRoomClientToServerCreateArgs;
    user: User;
    deviceID: string;
    currentMtvRoomID?: string;
}

interface MtvRoomServiceCreateMtvRoomWorkflowArgs {
    deviceID: string;
    params: MtvRoomClientToServerCreateArgs;
    user: User;
}

export default class MtvRoomService {
    /**
     * Throws an error if there are race conditions in mtv room creation options.
     */
    public static validateMtvRoomOptions(
        options: MtvRoomCreationOptionsWithoutInitialTracksIDs,
    ): void {
        if (
            options.isOpen === false &&
            options.isOpenOnlyInvitedUsersCanVote === true
        ) {
            throw new MtvRoomOptionsValidationInvalidInvitationOptionError(
                'isOpenOnlyInvitedUsersCanVote true when isOpen is false; isOpenOnlyInvitedUsersCanVote can be true only when isOpen is true too',
            );
        }

        if (
            options.hasPhysicalAndTimeConstraints === true &&
            options.physicalAndTimeConstraints === undefined
        ) {
            throw new MtvRoomOptionsValidationInvalidPhysicalAndTimeConstraintsOptionError(
                'hasPhysicalAndTimeConstraints is true but physicalAndTimeConstraints is undefined; physicalAndTimeConstraints must be defined when hasPhysicalAndTimeConstraints is true',
            );
        }

        if (
            options.hasPhysicalAndTimeConstraints === false &&
            options.physicalAndTimeConstraints !== undefined
        ) {
            throw new MtvRoomOptionsValidationInvalidPhysicalAndTimeConstraintsOptionError(
                'physicalAndTimeConstraints is defined but hasPhysicalAndTimeConstraints is false; physicalAndTimeConstraints must be undefined when hasPhysicalAndTimeConstraints is false',
            );
        }

        if (options.name === '') {
            throw new MtvRoomOptionsValidationInvalidNameOptionError(
                'name must not be empty',
            );
        }
    }

    /**
     * Creates a new mtv room from validated options.
     * If the user is already in a room, the user is removed from the old room.
     */
    public static async createMtvRoom({
        user,
        deviceID,
        options,
        currentMtvRoomID,
    }: MtvRoomServiceCreateMtvRoomArgs): Promise<void> {
        /**
         * Checking if user needs to leave previous
         * mtv room before creating new one
         */
        if (currentMtvRoomID !== undefined) {
            console.log(
                `User needs to leave current room before joining new one`,
            );
            await MtvRoomsWsController.onLeave({
                user,
                leavingRoomID: currentMtvRoomID,
            });
        }

        const mtvRoomState = await MtvRoomService.createMtvRoomWorkflow({
            params: options,
            user,
            deviceID,
        });

        Ws.io
            .to(mtvRoomState.workflowID)
            .emit('MTV_CREATE_ROOM_SYNCHED_CALLBACK', mtvRoomState.state);
    }

    private static async createMtvRoomWorkflow({
        params,
        user,
        deviceID,
    }: MtvRoomServiceCreateMtvRoomWorkflowArgs): Promise<MtvCreateWorkflowResponse> {
        let physicalAndTimeConstraintsWithCoords:
            | MtvRoomPhysicalAndTimeConstraintsWithCoords
            | undefined;
        let creatorFitsPositionConstraint: boolean | undefined;
        const roomID = randomUUID();
        const room = new MtvRoom();
        let roomHasBeenSaved = false;
        const userID = user.uuid;
        console.log(`USER ${userID} MTV_CREATE_ROOM ${roomID}`);

        if (
            params.hasPhysicalAndTimeConstraints &&
            params.physicalAndTimeConstraints !== undefined
        ) {
            const coords = await GeocodingService.getCoordsFromAddress(
                params.physicalAndTimeConstraints.physicalConstraintPlaceID,
            );
            physicalAndTimeConstraintsWithCoords = {
                ...params.physicalAndTimeConstraints,
                physicalConstraintPosition: coords,
            };

            //Checking for last known user position, and checking if it fits
            //With currently creating room position constraint to allow the creator
            //to vote for it's initial track
            creatorFitsPositionConstraint =
                await MtvRoomsWsController.checkUserDevicesPositionIfRoomHasPositionConstraints(
                    {
                        user,
                        roomConstraintInformation: {
                            constraintLat:
                                physicalAndTimeConstraintsWithCoords
                                    .physicalConstraintPosition.lat,
                            constraintLng:
                                physicalAndTimeConstraintsWithCoords
                                    .physicalConstraintPosition.lng,
                            constraintRadius:
                                physicalAndTimeConstraintsWithCoords.physicalConstraintRadius,
                            hasPositionAndTimeConstraints:
                                params.hasPhysicalAndTimeConstraints,
                        },
                        //The workflow isn't already created
                        persistToTemporalRequiredInformation: undefined,
                    },
                );
            console.log({ creatorFitsPositionConstraint });
        }

        /**
         * We need to create the socket-io room before the workflow
         * because we don't know if temporal will answer faster via the acknowledge
         * mtv room creation activity than adonis will execute this function
         */
        const roomCreator = await User.findOrFail(userID);
        await UserService.joinEveryUserDevicesToRoom(roomCreator, roomID);

        /**
         * Check for room name duplication
         * If room name is found in db
         * Just add creator nickame after the room name
         */
        const roomWithCreatedRoomName = await MtvRoom.findBy(
            'name',
            params.name,
        );
        const roomNameIsAlreadyTaken = roomWithCreatedRoomName !== null;
        if (roomNameIsAlreadyTaken) {
            params.name = `${params.name} (${roomCreator.nickname})`;
        }
        ///

        try {
            const temporalResponse =
                await MtvServerToTemporalController.createMtvWorkflow({
                    workflowID: roomID,
                    userID: userID,
                    deviceID,
                    params: {
                        ...params,
                        physicalAndTimeConstraints:
                            physicalAndTimeConstraintsWithCoords,
                        creatorFitsPositionConstraint,
                    },
                });

            room.merge({
                uuid: roomID,
                runID: temporalResponse.runID,
                name: params.name,
                //By setting this field lucid will manage the BelongsTo relationship
                creatorID: userID,
                isOpen: params.isOpen,
            });

            if (
                params.hasPhysicalAndTimeConstraints &&
                params.physicalAndTimeConstraints !== undefined &&
                physicalAndTimeConstraintsWithCoords
            ) {
                room.merge({
                    hasPositionAndTimeConstraints:
                        params.hasPhysicalAndTimeConstraints,
                    constraintRadius:
                        physicalAndTimeConstraintsWithCoords.physicalConstraintRadius,
                    constraintLat:
                        physicalAndTimeConstraintsWithCoords
                            .physicalConstraintPosition.lat,
                    constraintLng:
                        physicalAndTimeConstraintsWithCoords
                            .physicalConstraintPosition.lng,
                });
            }
            await room.save();
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
}
