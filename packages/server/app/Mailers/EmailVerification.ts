import { BaseMailer, MessageContract } from '@ioc:Adonis/Addons/Mail';
import View from '@ioc:Adonis/Core/View';
import User from 'App/Models/User';
import mjml from 'mjml';
export default class EmailVerification extends BaseMailer {
    constructor(private user: User, private token: string) {
        super();
    }

    public prepare(message: MessageContract): void {
        message
            .subject(
                `[${this.token}] - Musicroom. Welcome ${this.user.nickname}, please verify your email !`,
            )
            .from('no-reply@adonisenprovence.com')
            .to(this.user.email)
            .html(
                mjml(
                    View.renderSync('emails/email_verification', {
                        nickname: this.user.nickname,
                        token: this.token,
                    }),
                ).html,
            );
    }
}
