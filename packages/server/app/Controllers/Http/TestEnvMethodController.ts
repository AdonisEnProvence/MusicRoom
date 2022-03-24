import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import invariant from 'tiny-invariant';
import { DateTime } from 'luxon';
import Mail from '@ioc:Adonis/Addons/Mail';
import { ToggleMailTrafRequestBody } from '@musicroom/types';

function noop(): void {
    return undefined;
}

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

    public async toggleMailTrap({
        request,
    }: HttpContextContract): Promise<void> {
        const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';
        invariant(
            nodeEnvIsDevelopment,
            'Major error this route should not be callable outside dev env',
        );

        const rawBody = request.body();
        const { status } = ToggleMailTrafRequestBody.parse(rawBody);

        switch (status) {
            case 'DISABLE': {
                Mail.restore();
                break;
            }
            case 'ENABLE': {
                Mail.trap(noop);
                break;
            }
            default: {
                console.error(
                    'encountered unknown toggleMailTrap status in request body',
                );
            }
        }
    }
}
