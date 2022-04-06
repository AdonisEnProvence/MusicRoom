import { DateTime } from 'luxon';
import {
    BaseModel,
    beforeSave,
    BelongsTo,
    belongsTo,
    column,
} from '@ioc:Adonis/Lucid/Orm';
import Hash from '@ioc:Adonis/Core/Hash';
import { customAlphabet } from 'nanoid/async';
import TokenType from './TokenType';
import User from './User';

export default class Token extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column()
    public userUuid: string;

    @belongsTo(() => User)
    public user: BelongsTo<typeof User>;

    @column()
    public tokenTypeUuid: string;

    @belongsTo(() => TokenType)
    public tokenType: BelongsTo<typeof TokenType>;

    @column()
    public value: string;

    @beforeSave()
    public static async hashTokenValue(token: Token): Promise<void> {
        if (token.$dirty.value) {
            token.value = await Hash.make(token.value);
        }
    }

    @column()
    public isRevoked: boolean;

    public async revoke(this: Token): Promise<void> {
        this.isRevoked = true;
        await this.save();
    }

    @column.dateTime()
    public expiresAt: DateTime;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    public static async generateCode(): Promise<string> {
        const nanoid = customAlphabet('0123456789', 6);

        return await nanoid();
    }
}
