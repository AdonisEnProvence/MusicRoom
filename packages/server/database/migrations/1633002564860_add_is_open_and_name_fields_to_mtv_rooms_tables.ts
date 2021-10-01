import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MtvRooms extends BaseSchema {
    protected tableName = 'mtv_rooms';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.string('name').notNullable();
            table.boolean('is_open').notNullable().defaultTo(true);
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('name');
            table.dropColumn('is_open');
        });
    }
}
