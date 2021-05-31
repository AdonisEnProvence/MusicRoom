import test from 'japa';
import { ResponseToUniverse } from '@musicroom/types';

test('assert sum', (assert) => {
    assert.equal(ResponseToUniverse + ResponseToUniverse, 84);
});
