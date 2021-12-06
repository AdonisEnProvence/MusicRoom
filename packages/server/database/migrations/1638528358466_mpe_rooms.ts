import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MpeRooms extends BaseSchema {
    protected tableName = 'mpe_rooms';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').notNullable().primary();
            table.string('run_id').notNullable();
            table.uuid('creator').notNullable().references('users.uuid');
            table.string('name').notNullable().unique();
            table.boolean('is_open').notNullable().defaultTo(true);

            table.timestamps(true, true);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
