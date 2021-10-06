import { drop, factory, primaryKey } from '@mswjs/data';
import { TrackMetadataWithScore } from '@musicroom/types';
import { datatype, name, random } from 'faker';

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

export function dropDatabase(): void {
    drop(db);
}
