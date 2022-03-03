import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class UserAuthenticationSchema extends BaseSchema {
    protected tableName = 'users';

    public up(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('email', 255).notNullable();
            table.string('password', 180).notNullable();
            table.string('remember_me_token').nullable();
        });
    }

    public down(): void {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('email');
            table.dropColumn('password');
            table.dropColumn('remember_me_token');
        });
    }
}
