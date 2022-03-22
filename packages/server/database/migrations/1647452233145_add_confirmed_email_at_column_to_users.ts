import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Users extends BaseSchema {
    protected tableName = 'users';

    public up(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('confirmed_email_at', { useTz: true }).nullable();
        });
    }

    public down(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('confirmed_email_at');
        });
    }
}
