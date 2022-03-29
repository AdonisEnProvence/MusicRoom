import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail';
import View from '@ioc:Adonis/Core/View';
import User from 'App/Models/User';
import mjml from 'mjml';

export default class PasswordReset extends BaseMailer {
    constructor(private user: User, private token: string) {
        super();
    }

    public async prepare(message: MessageContract): Promise<void> {
        message
            .subject(`[${this.token}] Reset your password`)
            .from('no-reply@adonisenprovence.com', 'MusicRoom')
            .to(this.user.email, this.user.nickname)
            .html(
                mjml(
                    await View.render('emails/password_reset', {
                        token: this.token,
                    }),
                ).html,
            );
    }
}
