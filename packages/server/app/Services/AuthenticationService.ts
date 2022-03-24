import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { TokenTypeName } from '@musicroom/types';
import Token from 'App/Models/Token';
import TokenType from 'App/Models/TokenType';
import User from 'App/Models/User';
import EmailVerification from 'App/Mailers/EmailVerification';

export class AuthenticationService {
    public static async sendEmailForEmailConfirmation({
        user,
    }: {
        user: User;
    }): Promise<void> {
        const emailConfirmationTokenType = await TokenType.findByOrFail(
            'name',
            TokenTypeName.enum.EMAIL_CONFIRMATION,
        );
        const confirmationTokenValue = await Token.generateCode();
        const confirmationTokenExpiresAt = DateTime.now().plus({
            minutes: 15,
        });

        await user.related('tokens').create({
            uuid: randomUUID(),
            tokenTypeUuid: emailConfirmationTokenType.uuid,
            value: confirmationTokenValue,
            expiresAt: confirmationTokenExpiresAt,
        });

        const emailVerification = new EmailVerification(
            user,
            confirmationTokenValue,
        );
        await emailVerification.sendLater().catch((e) => console.error(e));
    }
}
