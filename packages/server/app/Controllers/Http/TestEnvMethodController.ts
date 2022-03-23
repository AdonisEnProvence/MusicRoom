import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import invariant from 'tiny-invariant';
import { DateTime } from 'luxon';

export default class TestEnvMethodController {
    public async bypassUserEmailConfirmation({
        auth,
    }: HttpContextContract): Promise<void> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to get her profile information',
        );

        const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';
        invariant(
            nodeEnvIsDevelopment,
            'Major error this route should not be callable outside dev env',
        );

        user.confirmedEmailAt = DateTime.now();
        await user.save();
    }
}
