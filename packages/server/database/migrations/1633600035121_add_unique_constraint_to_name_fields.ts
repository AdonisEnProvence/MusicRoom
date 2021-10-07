import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MtvRooms extends BaseSchema {
    protected tableName = 'mtv_rooms';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.unique(['name']);
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropUnique(['name']);
        });
    }
}
