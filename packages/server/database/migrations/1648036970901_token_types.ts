import { randomUUID } from 'crypto';
import BaseSchema from '@ioc:Adonis/Lucid/Schema';
import { TokenTypeName } from '@musicroom/types';

export default class TokenTypes extends BaseSchema {
    protected tableName = 'token_types';

    public up(): void {
        void this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').primary();

            table.string('name').notNullable().unique();
        });

        this.defer(async (db) => {
            await db.table(this.tableName).multiInsert(
                TokenTypeName.options.map((tokenName) => ({
                    uuid: randomUUID(),
                    name: tokenName,
                })),
            );
        });
    }

    public down(): void {
        void this.schema.dropTable(this.tableName);
    }
}
