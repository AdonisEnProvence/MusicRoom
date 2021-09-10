import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MtvRooms extends BaseSchema {
    protected tableName = 'mtv_rooms';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table
                .boolean('has_position_and_time_constraints')
                .notNullable()
                .defaultTo(false);
            table.float('constraint_lat').nullable();
            table.float('constraint_lng').nullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('has_position_and_time_constraints');
            table.dropColumn('constraint_lat');
            table.dropColumn('constraint_lng');
        });
    }
}
