import { factory, primaryKey } from '@mswjs/data';
import { datatype, name, random } from 'faker';

export const db = factory({
    tracks: {
        id: primaryKey(() => datatype.uuid()),
        title: () => random.words(3),
    },

    tracksMetadata: {
        id: primaryKey(() => datatype.uuid()),
        artistName: () => name.title(),
        duration: () => 'PT4M52S' as string,
        title: () => random.words(),
    },
});
