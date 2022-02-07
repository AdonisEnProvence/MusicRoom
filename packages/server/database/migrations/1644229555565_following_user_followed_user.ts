import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class FollowingUserFollowedUser extends BaseSchema {
    protected tableName = 'following_user_followed_user';

    //pivot table
    public up(): void {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table
                .uuid('following_user_uuid')
                .references('users.uuid')
                .onDelete('CASCADE');
            table
                .uuid('followed_user_uuid')
                .references('users.uuid')
                .onDelete('CASCADE');
            table.unique(['following_user_uuid', 'followed_user_uuid']);
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
