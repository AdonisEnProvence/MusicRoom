import { randomUUID } from 'crypto';
import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
    HasMany,
    hasMany,
    ManyToMany,
    manyToMany,
} from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import Device from './Device';
import MtvRoom from './MtvRoom';
import MpeRoom from './MpeRoom';

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

    //Members relationship
    @manyToMany(() => MpeRoom, {
        localKey: 'uuid',
        relatedKey: 'uuid',

        pivotTable: 'users_mpe_rooms',
        pivotForeignKey: 'user_uuid',
        pivotRelatedForeignKey: 'mpe_room_uuid',
    })
    public mpeRooms: ManyToMany<typeof MpeRoom>;
    ///

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
