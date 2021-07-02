import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Users extends BaseSchema {
    protected tableName = 'users';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table
                .uuid('mtv_room_id')
                .nullable()
                .references('mtv_rooms.uuid')
                .onDelete('SET NULL');
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('mtv_room_id');
        });
    }
}
