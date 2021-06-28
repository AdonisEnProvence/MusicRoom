import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import { DateTime } from 'luxon';
import User from './User';

export default class MtvRoom extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'run_id' })
    public runID: string;

    @column()
    public creator: string;

    @belongsTo(() => User, {
        foreignKey: 'uuid',
    })
    public creatorRef: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;
}
