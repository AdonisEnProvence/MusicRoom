import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
    HasMany,
    hasMany,
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

    @column({ columnName: 'mtv_room_id' })
    public mtvRoomID: string | null;

    @belongsTo(() => MtvRoom, {
        foreignKey: 'mtvRoomID',
    })
    public mtvRoom: BelongsTo<typeof MtvRoom>;

    @hasMany(() => Device, {
        foreignKey: 'userID',
    })
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
