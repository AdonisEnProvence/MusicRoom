import {
    MtvRoomClientToServerCreateArgs,
    MtvRoomCreationOptionsWithoutInitialTracksIDs,
} from '@musicroom/types';
import MtvRoomsWsController from 'App/Controllers/Ws/MtvRoomsWsController';
import User from 'App/Models/User';
import Ws from './Ws';

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

        const mtvRoomState = await MtvRoomsWsController.onCreate({
            params: options,
            user,
            deviceID,
        });

        Ws.io
            .to(mtvRoomState.workflowID)
            .emit('MTV_CREATE_ROOM_SYNCHED_CALLBACK', mtvRoomState.state);
    }
}
