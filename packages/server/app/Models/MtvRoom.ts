import {
    BaseModel,
    column,
    hasMany,
    HasMany,
    HasOne,
    hasOne,
} from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import MtvRoomInvitation from './MtvRoomInvitation';
import User from './User';

export default class MtvRoom extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'run_id' })
    public runID: string;

    @column()
    public name: string;

    @column({ columnName: 'creator' })
    public creatorID: string;

    @hasOne(() => User, {
        localKey: 'creatorID',
        foreignKey: 'uuid',
    })
    public creator: HasOne<typeof User>;

    @hasMany(() => User, {
        foreignKey: 'mtvRoomID',
    })
    public members: HasMany<typeof User>;

    @hasMany(() => MtvRoomInvitation, {
        foreignKey: 'mtvRoomID',
    })
    public invitations: HasMany<typeof MtvRoomInvitation>;

    @column()
    public constraintLng: number | null;

    @column()
    public constraintLat: number | null;

    @column()
    public constraintRadius: number | null;

    @column()
    public hasPositionAndTimeConstraints: boolean;

    @column()
    public isOpen: boolean;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;
}
