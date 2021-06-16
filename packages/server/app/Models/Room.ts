import { BaseModel, beforeCreate, column } from '@ioc:Adonis/Lucid/Orm';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

export default class Room extends BaseModel {
    @column({ isPrimary: true })
    public uuid: string;

    @column({ columnName: 'run_id' })
    public runID: string;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static assignUuid(room: Room): void {
        room.uuid = randomUUID();
    }
}
