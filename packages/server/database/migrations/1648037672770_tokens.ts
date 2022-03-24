import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Tokens extends BaseSchema {
    protected tableName = 'tokens';

    public up(): void {
        void this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').primary();

            table
                .uuid('user_uuid')
                .notNullable()
                .references('uuid')
                .inTable('users');
            table
                .uuid('token_type_uuid')
                .notNullable()
                .references('uuid')
                .inTable('token_types');

            table.string('value').notNullable();
            table.boolean('is_revoked').defaultTo(false);
            table.timestamp('expires_at', { useTz: true }).notNullable();

            /**
             * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
             */
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public down(): void {
        void this.schema.dropTable(this.tableName);
    }
}
