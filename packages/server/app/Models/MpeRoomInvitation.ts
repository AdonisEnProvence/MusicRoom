import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import {
    BaseModel,
    beforeCreate,
    BelongsTo,
    belongsTo,
    column,
} from '@ioc:Adonis/Lucid/Orm';
import User from './User';
import MpeRoom from './MpeRoom';

export default class MpeRoomInvitation extends BaseModel {
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

    //Involved Mpe Room ID
    @column({ columnName: 'mpe_room_id' })
    public mpeRoomID: string;

    @belongsTo(() => MpeRoom, {
        foreignKey: 'mpeRoomID',
    })
    public mpeRoom: BelongsTo<typeof MpeRoom>;
    ///

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(invitation: MpeRoomInvitation): void {
        invitation.uuid = randomUUID();
    }
}
