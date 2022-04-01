import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Users extends BaseSchema {
    protected tableName = 'users';

    public up(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('google_id').unique().nullable();
            table.setNullable('password');
        });
    }

    public down(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('google_id');
            table.dropNullable('password');
        });
    }
}
