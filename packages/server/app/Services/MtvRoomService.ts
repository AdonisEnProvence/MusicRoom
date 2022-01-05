import { MtvRoomCreationOptionsWithoutInitialTracksIDs } from '@musicroom/types';

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
}
