import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MpeRoomInvitations extends BaseSchema {
    protected tableName = 'mpe_room_invitations';

    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').notNullable().primary();
            table
                .uuid('mpe_room_id')
                .notNullable()
                .references('mpe_rooms.uuid')
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
            table.unique([
                'mpe_room_id',
                'invited_user_id',
                'inviting_user_id',
            ]);
        });
    }

    public down(): void {
        this.schema.dropTable(this.tableName);
    }
}
