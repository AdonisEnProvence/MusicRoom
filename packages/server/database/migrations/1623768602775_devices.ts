import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Devices extends BaseSchema {
    protected tableName = 'devices';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').notNullable().primary();
            table.string('socket_id').notNullable();
            table.uuid('user_id').notNullable().references('users.uuid');
            table.string('user_agent');
            table.timestamps(true, true);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
