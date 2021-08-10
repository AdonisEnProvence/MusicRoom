import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Devices extends BaseSchema {
    protected tableName = 'devices';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.string('name').notNullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('name');
        });
    }
}
