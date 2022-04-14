import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Env from '@ioc:Adonis/Core/Env';

export default class TemporalAdonisAuth {
    public async handle(
        { request, response }: HttpContextContract,
        next: () => Promise<void>,
    ): Promise<void> {
        const reqAuthorizationHeader = request.header('Authorization');
        const trustedKey = Env.get('TEMPORAL_ADONIS_KEY');

        const retrievedKeyIsValid = trustedKey === reqAuthorizationHeader;
        if (retrievedKeyIsValid === true) {
            await next();
        } else {
            response.abort(undefined, 401);
        }
    }
}
