import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Rooms extends BaseSchema {
    protected tableName = 'rooms';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.string('creator').notNullable(); //this should become table.uuid('creator').notNullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('creator');
        });
    }
}
