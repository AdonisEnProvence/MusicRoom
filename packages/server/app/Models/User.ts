import { randomUUID } from 'crypto';
import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
    HasMany,
    hasMany,
    HasOne,
    hasOne,
    ManyToMany,
    manyToMany,
} from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import Device from './Device';
import MtvRoom from './MtvRoom';
import MpeRoom from './MpeRoom';
import SettingVisibility from './SettingVisibility';

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

    @hasOne(() => SettingVisibility, {
        localKey: 'playlistsVisibilitySettingUuid',
        foreignKey: 'uuid',
    })
    public playlistsVisibilitySetting: HasOne<typeof SettingVisibility>;

    @column({ columnName: 'playlists_visibility_setting_uuid' })
    public playlistsVisibilitySettingUuid: string;

    @hasOne(() => SettingVisibility, {
        localKey: 'relationsVisibilitySettingUuid',
        foreignKey: 'uuid',
    })
    public relationsVisibilitySetting: HasOne<typeof SettingVisibility>;

    @column({ columnName: 'relations_visibility_setting_uuid' })
    public relationsVisibilitySettingUuid: string;

    @hasOne(() => SettingVisibility, {
        localKey: 'devicesVisibilitySettingUuid',
        foreignKey: 'uuid',
    })
    public devicesVisibilitySetting: HasOne<typeof SettingVisibility>;

    @column({ columnName: 'devices_visibility_setting_uuid' })
    public devicesVisibilitySettingUuid: string;

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
