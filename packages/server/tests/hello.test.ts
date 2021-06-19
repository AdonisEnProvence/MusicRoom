import { ResponseToUniverse } from '@musicroom/types';
import test from 'japa';
import supertest from 'supertest';

const BASE_URL = `http://${process.env.HOST!}:${process.env.PORT!}`;

test('assert sum', (assert) => {
    assert.equal(ResponseToUniverse + ResponseToUniverse, 84);
});

test('/ route returns JSON object', async (assert) => {
    const { body } = await supertest(BASE_URL)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

    assert.deepStrictEqual(body, { hello: 'world' });
});
