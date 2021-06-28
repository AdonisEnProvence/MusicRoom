import {
    BaseModel,
    beforeCreate,
    column,
    HasMany,
    hasMany,
    HasOne,
    hasOne,
} from '@ioc:Adonis/Lucid/Orm';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import Device from './Device';
import MtvRoom from './MtvRoom';

export default class User extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column()
    public nickname: string;

    @hasOne(() => MtvRoom)
    public mtvRoom: HasOne<typeof MtvRoom>;

    @hasMany(() => Device)
    public devices: HasMany<typeof Device>;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(user: User): void {
        //For tests purposes only where we hard set uuid
        if (!user.uuid) {
            user.uuid = randomUUID();
        }
    }
}
