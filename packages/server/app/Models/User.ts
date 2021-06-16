import { BaseModel, beforeCreate, column } from '@ioc:Adonis/Lucid/Orm';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

export default class User extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column()
    public nickname: string;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(user: User): void {
        user.uuid = randomUUID();
    }
}
