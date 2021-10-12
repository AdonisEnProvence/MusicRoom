import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MtvRoomInvitations extends BaseSchema {
    protected tableName = 'mtv_room_invitations';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').notNullable().primary();
            table
                .uuid('mtv_room_id')
                .notNullable()
                .references('mtv_rooms.uuid')
                .onDelete('CASCADE');
            table
                .uuid('invited_user_id')
                .notNullable()
                .references('users.uuid')
                .onDelete('CASCADE');
            table
                .uuid('inviting_user_id')
                .notNullable()
                .references('users.uuid')
                .onDelete('CASCADE'); //always roomID creator
            table.timestamps(true, true);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
