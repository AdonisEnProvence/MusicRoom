import { randomUUID } from 'crypto';
import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
} from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import MtvRoom from './MtvRoom';
import User from './User';

export default class MtvRoomInvitation extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    //Inviting User
    @column({ columnName: 'inviting_user_id' })
    public invitingUserID: string;

    @belongsTo(() => User, {
        foreignKey: 'invitingUserID',
    })
    public invitingUser: BelongsTo<typeof User>;
    ///

    //Invited User
    @column({ columnName: 'invited_user_id' })
    public invitedUserID: string;

    @belongsTo(() => User, {
        foreignKey: 'invitedUserID',
    })
    public invitedUser: BelongsTo<typeof User>;
    ///

    //Involved Mtv Room ID
    @column({ columnName: 'mtv_room_id' })
    public mtvRoomID: string;

    @belongsTo(() => MtvRoom, {
        foreignKey: 'mtvRoomID',
    })
    public mtvRoom: BelongsTo<typeof MtvRoom>;
    ///

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(invitation: MtvRoomInvitation): void {
        invitation.uuid = randomUUID();
    }
}
