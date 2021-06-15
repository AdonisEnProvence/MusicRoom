import { factory, primaryKey } from '@mswjs/data';
import { datatype, random } from 'faker';

export const db = factory({
    tracks: {
        id: primaryKey(() => datatype.uuid()),
        title: () => random.words(3),
    },
});
