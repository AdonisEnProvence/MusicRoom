import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Rooms extends BaseSchema {
    protected tableName = 'rooms';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').notNullable().primary();
            table.string('run_id').notNullable();
            table.timestamps(true, true);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
