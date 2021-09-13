import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import User from './User';

export default class MtvRoom extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'run_id' })
    public runID: string;

    @column()
    public creator: string;

    @hasMany(() => User, {
        foreignKey: 'mtvRoomID',
    })
    public members: HasMany<typeof User>;

    @column()
    public constraintLng: number | null;

    @column()
    public constraintLat: number | null;

    @column()
    public constraintRadius: number | null;

    @column()
    public hasPositionAndTimeConstraints: boolean;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;
}
