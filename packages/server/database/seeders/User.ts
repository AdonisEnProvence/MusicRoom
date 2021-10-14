import BaseSeeder from '@ioc:Adonis/Lucid/Seeder';
import User from 'App/Models/User';
import faker, { datatype, internet } from 'faker';

faker.seed(42);

export default class UserSeeder extends BaseSeeder {
    public static developmentOnly = true;

    public async run(): Promise<void> {
        const uniqueKey = 'uuid';

        await User.updateOrCreateMany(uniqueKey, [
            {
                uuid: 'f5ddbf01-cc01-4422-b347-67988342b558',
                nickname: 'Web',
            },
            {
                uuid: '9ed60e96-d5fc-40b3-b842-aeaa75e93972',
                nickname: 'Mobile',
            },
            ...Array.from({ length: 15 }).map(() => ({
                uuid: datatype.uuid(),
                nickname: `A${internet.userName()}`,
            })),
        ]);
    }
}
