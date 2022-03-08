import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import AuthMiddleware from './Auth';

export default class EveryAuthMiddleware extends AuthMiddleware {
    public async handle(
        context: HttpContextContract,
        next: () => Promise<void>,
    ): Promise<void> {
        return super.handle(context, next, ['web', 'api']);
    }
}
