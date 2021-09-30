import test from 'japa';
import supertest from 'supertest';
import { BASE_URL } from './utils/TestUtils';

test('/ route returns JSON object', async (assert) => {
    const { body } = await supertest(BASE_URL)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

    assert.deepStrictEqual(body, { hello: 'world' });
});
