import { randomUUID } from 'crypto';
import BaseSchema from '@ioc:Adonis/Lucid/Schema';
import { UserSettingVisibility } from '@musicroom/types';
import invariant from 'tiny-invariant';

export default class CreateVisibilitySettingsTableAndReferenceItInUsersTables extends BaseSchema {
    protected tableName = 'setting_visibilities';

    public async up(): Promise<void> {
        const settingVisibilitiesPossibleValues = [
            {
                uuid: randomUUID(),
                name: UserSettingVisibility.enum.PUBLIC,
            },
            {
                uuid: randomUUID(),
                name: UserSettingVisibility.enum.PRIVATE,
            },
            {
                uuid: randomUUID(),
                name: UserSettingVisibility.enum.FOLLOWERS_ONLY,
            },
        ];

        this.schema.createTable(this.tableName, (table) => {
            table.uuid('uuid').primary();
            table.string('name').notNullable().unique();
        });

        this.defer(async (db) => {
            await db
                .table(this.tableName)
                .multiInsert(settingVisibilitiesPossibleValues);
        });

        this.schema.alterTable('users', (table) => {
            const publicVisibilitySettingRow =
                settingVisibilitiesPossibleValues.find(
                    (settingVisibility) => settingVisibility.name === 'PUBLIC',
                );
            invariant(
                publicVisibilitySettingRow !== undefined,
                'Public visibility setting row not found',
            );
            const publicVisibilitySettingRowUUID =
                publicVisibilitySettingRow.uuid;

            table
                .uuid('playlists_visibility_setting_uuid')
                .references(`${this.tableName}.uuid`)
                .notNullable()
                .defaultTo(publicVisibilitySettingRowUUID);

            table
                .uuid('relations_visibility_setting_uuid')
                .references(`${this.tableName}.uuid`)
                .notNullable()
                .defaultTo(publicVisibilitySettingRowUUID);

            table
                .uuid('devices_visibility_setting_uuid')
                .references(`${this.tableName}.uuid`)
                .notNullable()
                .defaultTo(publicVisibilitySettingRowUUID);
        });
    }

    public async down(): Promise<void> {
        this.schema.alterTable('users', (table) => {
            table.dropColumn('playlists_visibility_setting_uuid');
            table.dropColumn('relations_visibility_setting_uuid');
            table.dropColumn('devices_visibility_setting_uuid');
        });

        this.schema.dropTable(this.tableName);
    }
}
