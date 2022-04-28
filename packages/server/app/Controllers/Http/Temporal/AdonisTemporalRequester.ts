import got from 'got';
import Env from '@ioc:Adonis/Core/Env';

export const adonisToTemporalRequester = got.extend({
    headers: {
        Authorization: Env.get('ADONIS_TEMPORAL_KEY'),
    },
});
