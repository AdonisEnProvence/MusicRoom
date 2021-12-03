import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class UsersMpeRooms extends BaseSchema {
    protected tableName = 'users_mpe_rooms';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table.integer('user_uuid').unsigned().references('users.uuid');
            table
                .integer('mpe_room_uuid')
                .unsigned()
                .references('mpe_rooms.uuid');
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
