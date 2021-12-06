import { DateTime } from 'luxon';
import {
    BaseModel,
    column,
    HasOne,
    hasOne,
    ManyToMany,
    manyToMany,
} from '@ioc:Adonis/Lucid/Orm';
import User from './User';

export default class MpeRoom extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'run_id' })
    public runID: string;

    @column()
    public name: string;

    @column({ columnName: 'creator' })
    public creatorID: string;

    //Creator relationship
    @hasOne(() => User, {
        localKey: 'creatorID',
        foreignKey: 'uuid',
    })
    public creator: HasOne<typeof User>;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;
    ///

    //Members relationship
    @manyToMany(() => User, {
        localKey: 'uuid',
        relatedKey: 'uuid',

        pivotTable: 'users_mpe_rooms',
        pivotForeignKey: 'mpe_room_uuid',
        pivotRelatedForeignKey: 'user_uuid',
    })
    public members: ManyToMany<typeof User>;
    ///

    //todo invitations

    @column()
    public isOpen: boolean;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;
}
