import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Devices extends BaseSchema {
    protected tableName = 'devices';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.timestamp('lat_lng_updated_at').nullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('lat_lng_updated_at');
        });
    }
}
