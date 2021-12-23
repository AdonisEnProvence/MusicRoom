import { drop, factory, primaryKey } from '@mswjs/data';
import {
    MpeRoomSummary,
    MpeWorkflowState,
    MtvRoomSummary,
    MtvWorkflowState,
    TrackMetadataWithScore,
    UserDevice,
    UserSummary,
} from '@musicroom/types';
import { LocationObject } from 'expo-location';
import { datatype, name, random, internet } from 'faker';

export const db = factory({
    searchableTracks: {
        id: primaryKey(() => datatype.uuid()),
        title: () => random.words(3),
        artistName: () => name.findName(),
        duration: () => datatype.number(),
    },

    searchableRooms: {
        roomID: primaryKey(() => datatype.uuid()),
        roomName: () => random.words(datatype.number({ min: 1, max: 5 })),
        creatorName: () => name.title(),
        isOpen: () => datatype.boolean(),
        isInvited: () => datatype.boolean(),
    },

    searchableMpeRooms: {
        roomID: primaryKey(() => datatype.uuid()),
        roomName: () => random.words(datatype.number({ min: 1, max: 5 })),
        creatorName: () => name.title(),
        isOpen: () => datatype.boolean(),
        isInvited: () => datatype.boolean(),
    },

    searchableUsers: {
        userID: primaryKey(() => datatype.uuid()),
        nickname: () => internet.userName(),
    },
});

export function generateTrackMetadata(
    overrides?: Partial<TrackMetadataWithScore>,
): TrackMetadataWithScore {
    return {
        id: datatype.uuid(),
        artistName: name.title(),
        duration: 42000 as number,
        title: random.words(),
        score: datatype.number(),

        ...overrides,
    };
}

export function generateMtvRoomSummary(
    overrides?: Partial<MtvRoomSummary>,
): MtvRoomSummary {
    return {
        creatorName: random.word(),
        isOpen: datatype.boolean(),
        roomID: datatype.uuid(),
        roomName: random.words(3),
        isInvited: datatype.boolean(),
        ...overrides,
    };
}

export function generateMpeRoomSummary(
    overrides?: Partial<MpeRoomSummary>,
): MpeRoomSummary {
    return {
        creatorName: random.word(),
        isOpen: datatype.boolean(),
        roomID: datatype.uuid(),
        roomName: random.words(3),
        isInvited: datatype.boolean(),
        ...overrides,
    };
}

export function generateUserSummary(
    overrides?: Partial<UserSummary>,
): UserSummary {
    return {
        userID: datatype.uuid(),
        nickname: internet.userName(),

        ...overrides,
    };
}

interface GenerateMtvWorklowStateArgs {
    userType: 'CREATOR' | 'USER';

    overrides?: Partial<MtvWorkflowState>;
}

export function generateUserDevice(
    overrides?: Partial<UserDevice>,
): UserDevice {
    return {
        deviceID: datatype.uuid(),
        name: random.words(),

        ...overrides,
    };
}

export function generateMpeWorkflowState(
    overrides?: Partial<MpeWorkflowState>,
): MpeWorkflowState {
    const tracksList = generateArray({
        minLength: 2,
        maxLength: 6,
        fill: generateTrackMetadata,
    });
    const roomCreatorUserID = datatype.uuid();

    return {
        name: random.words(),
        roomID: datatype.uuid(),
        roomCreatorUserID,
        usersLength: 1,
        isOpen: true,
        isOpenOnlyInvitedUsersCanEdit: false,
        tracks: tracksList.slice(1),
        playlistTotalDuration: 42000, //TODO

        ...overrides,
    };
}

function generateMtvWorkflowStateForRoomCreator(
    overrides?: Partial<MtvWorkflowState>,
): MtvWorkflowState {
    const tracksList = generateArray({
        minLength: 2,
        maxLength: 6,
        fill: generateTrackMetadata,
    });
    const roomCreatorUserID = datatype.uuid();

    return {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        roomCreatorUserID,
        usersLength: 1,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        delegationOwnerUserID: null,
        timeConstraintIsValid: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: datatype.uuid(),
            userID: roomCreatorUserID,
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 1,

        ...overrides,
    };
}

function generateMtvWorkflowStateForUser(
    overrides?: Partial<MtvWorkflowState>,
): MtvWorkflowState {
    const tracksList = generateArray({
        minLength: 2,
        maxLength: 6,
        fill: generateTrackMetadata,
    });

    return {
        name: random.words(),
        roomID: datatype.uuid(),
        playing: false,
        roomCreatorUserID: datatype.uuid(),
        usersLength: 2,
        playingMode: 'BROADCAST',
        isOpen: true,
        isOpenOnlyInvitedUsersCanVote: false,
        hasTimeAndPositionConstraints: false,
        delegationOwnerUserID: null,
        timeConstraintIsValid: null,
        userRelatedInformation: {
            hasControlAndDelegationPermission: true,
            userFitsPositionConstraint: null,
            userHasBeenInvited: false,
            emittingDeviceID: datatype.uuid(),
            userID: datatype.uuid(),
            tracksVotedFor: [],
        },
        currentTrack: {
            ...tracksList[0],
            elapsed: 0,
        },
        tracks: tracksList.slice(1),
        minimumScoreToBePlayed: 1,

        ...overrides,
    };
}

export function generateMtvWorklowState({
    userType,

    overrides,
}: GenerateMtvWorklowStateArgs): MtvWorkflowState {
    switch (userType) {
        case 'CREATOR': {
            return generateMtvWorkflowStateForRoomCreator(overrides);
        }

        case 'USER': {
            return generateMtvWorkflowStateForUser(overrides);
        }

        default: {
            throw new Error('Reached unreachable state');
        }
    }
}

interface GenerateArrayArgs<Item> {
    minLength: number;
    maxLength: number;
    fill: ((index: number) => Item) | (() => Item);
}

export function generateArray<Item>({
    minLength,
    maxLength,
    fill,
}: GenerateArrayArgs<Item>): Item[] {
    return Array.from({
        length: datatype.number({ min: minLength, max: maxLength }),
    }).map((_, index) => fill(index));
}

export function generateLocationObject(
    overrides?: LocationObject,
): LocationObject {
    return {
        timestamp: datatype.number(),
        coords: {
            accuracy: 4,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: datatype.number({
                min: -80,
                max: 75,
            }),
            longitude: datatype.number({
                min: -180,
                max: 175,
            }),
            speed: null,
        },

        ...overrides,
    };
}

export function dropDatabase(): void {
    drop(db);
}
