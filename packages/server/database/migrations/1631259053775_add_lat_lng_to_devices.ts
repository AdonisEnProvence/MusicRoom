import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class Devices extends BaseSchema {
    protected tableName = 'devices';

    public up(): void {
        this.schema.table(this.tableName, (table) => {
            table.float('lat').nullable();
            table.float('lng').nullable();
        });
    }

    public down(): void {
        this.schema.table(this.tableName, (table) => {
            table.dropColumn('lat');
            table.dropColumn('lng');
        });
    }
}
