import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class MtvRooms extends BaseSchema {
    protected tableName = 'mtv_rooms';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.integer('constraint_radius').nullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('constraint_radius');
        });
    }
}
