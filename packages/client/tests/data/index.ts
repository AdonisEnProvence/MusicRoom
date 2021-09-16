import { drop, factory, primaryKey } from '@mswjs/data';
import { datatype, name, random } from 'faker';
import { TrackMetadataWithScore } from '../../../types/dist';

export const db = factory({
    searchableTracks: {
        id: primaryKey(() => datatype.uuid()),
        title: () => random.words(3),
        artistName: () => name.findName(),
        duration: () => datatype.number(),
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
