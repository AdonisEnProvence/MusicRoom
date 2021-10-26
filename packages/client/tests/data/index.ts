import { drop, factory, primaryKey } from '@mswjs/data';
import {
    MtvRoomSummary,
    TrackMetadataWithScore,
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

export function generateUserSummary(
    overrides?: Partial<UserSummary>,
): UserSummary {
    return {
        userID: datatype.uuid(),
        nickname: internet.userName(),

        ...overrides,
    };
}

export function generateArray<Item>(length: number, fill: () => Item): Item[] {
    return Array.from({ length }).map(() => fill());
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
