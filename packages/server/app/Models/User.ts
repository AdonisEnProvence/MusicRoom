import { randomUUID } from 'crypto';
import {
    BaseModel,
    beforeCreate,
    beforeSave,
    BelongsTo,
    belongsTo,
    column,
    HasMany,
    hasMany,
    ManyToMany,
    manyToMany,
} from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import { UserSettingVisibility } from '@musicroom/types';
import Hash from '@ioc:Adonis/Core/Hash';
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

    @belongsTo(() => SettingVisibility, {
        localKey: 'uuid',
        foreignKey: 'playlistsVisibilitySettingUuid',
    })
    public playlistsVisibilitySetting: BelongsTo<typeof SettingVisibility>;

    @column({ columnName: 'playlists_visibility_setting_uuid' })
    public playlistsVisibilitySettingUuid: string;

    @beforeCreate()
    public static async assignPlaylistsVisibilitySetting(
        user: User,
    ): Promise<void> {
        if (user.playlistsVisibilitySettingUuid === undefined) {
            const publicVisibilitySetting =
                await SettingVisibility.findByOrFail(
                    'name',
                    UserSettingVisibility.enum.PUBLIC,
                );

            user.playlistsVisibilitySettingUuid = publicVisibilitySetting.uuid;
        }
    }

    @belongsTo(() => SettingVisibility, {
        localKey: 'uuid',
        foreignKey: 'relationsVisibilitySettingUuid',
    })
    public relationsVisibilitySetting: BelongsTo<typeof SettingVisibility>;

    @column({ columnName: 'relations_visibility_setting_uuid' })
    public relationsVisibilitySettingUuid: string;

    @beforeCreate()
    public static async assignRelationsVisibilitySetting(
        user: User,
    ): Promise<void> {
        if (user.relationsVisibilitySettingUuid === undefined) {
            const publicVisibilitySetting =
                await SettingVisibility.findByOrFail(
                    'name',
                    UserSettingVisibility.enum.PUBLIC,
                );

            user.relationsVisibilitySettingUuid = publicVisibilitySetting.uuid;
        }
    }

    @manyToMany(() => User, {
        localKey: 'uuid', //following
        relatedKey: 'uuid', //followed

        pivotTable: 'following_user_followed_user',
        pivotForeignKey: 'following_user_uuid',
        pivotRelatedForeignKey: 'followed_user_uuid',
    })
    public following: ManyToMany<typeof User>;

    @manyToMany(() => User, {
        localKey: 'uuid', //followed
        relatedKey: 'uuid', //following

        pivotTable: 'following_user_followed_user',
        pivotForeignKey: 'followed_user_uuid',
        pivotRelatedForeignKey: 'following_user_uuid',
    })
    public followers: ManyToMany<typeof User>;

    //Authentication
    @column()
    public email: string;

    @column({ serializeAs: null })
    public password: string;

    @column()
    public rememberMeToken?: string;

    @beforeSave()
    public static async hashPassword(user: User): Promise<void> {
        if (user.$dirty.password) {
            user.password = await Hash.make(user.password);
        }
    }
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
