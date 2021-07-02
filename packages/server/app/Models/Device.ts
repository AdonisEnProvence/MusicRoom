import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
} from '@ioc:Adonis/Lucid/Orm';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import User from './User';

export default class Device extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'user_id' })
    public userID: string;

    @column({ columnName: 'socket_id' })
    public socketID: string;

    @belongsTo(() => User, {
        foreignKey: 'userID',
    })
    public user: BelongsTo<typeof User>;

    @column()
    public userAgent?: string;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(device: Device): void {
        device.uuid = randomUUID();
    }
}
