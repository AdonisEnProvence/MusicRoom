import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class UsersMpeRooms extends BaseSchema {
    protected tableName = 'users_mpe_rooms';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table.uuid('user_uuid').references('users.uuid');
            table.uuid('mpe_room_uuid').references('mpe_rooms.uuid');
            table.unique(['user_uuid', 'mpe_room_uuid']);
            /**
             * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
             */
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
