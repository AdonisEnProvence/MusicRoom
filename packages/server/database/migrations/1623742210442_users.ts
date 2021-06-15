import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Users extends BaseSchema {
    protected tableName = 'users';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('uuid').primary();
            table.string('nickname').unique().notNullable();
            table.timestamps(true, true);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
