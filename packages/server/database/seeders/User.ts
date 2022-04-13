import BaseSeeder from '@ioc:Adonis/Lucid/Seeder';
import User from 'App/Models/User';
import faker, { datatype, internet } from 'faker';
import { DateTime } from 'luxon';

faker.seed(42);

export default class UserSeeder extends BaseSeeder {
    public static developmentOnly = true;

    public async run(): Promise<void> {
        const users = await User.createMany([
            {
                uuid: '9ed60e96-d5fc-40b3-b842-aeaa75e93972',
                nickname: 'Mobile',
                email: internet.email(),
                password: internet.password(),
            },

            // Copy-pasted from packages/client/e2e/home.spec.ts
            {
                uuid: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
                nickname: 'Francis',
                email: internet.email(),
                password: internet.password(),
            },
            {
                uuid: '71bc3025-b765-4f84-928d-b4dca8871370',
                nickname: 'Moris',
                email: internet.email(),
                password: internet.password(),
            },
            {
                uuid: 'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
                nickname: 'Leila',
                email: internet.email(),
                password: internet.password(),
            },
            {
                uuid: '7f4bc598-c5be-4412-acc4-515a87b797e7',
                nickname: 'Manon',
                email: internet.email(),
                password: internet.password(),
            },

            ...Array.from({ length: 15 }).map(() => ({
                uuid: datatype.uuid(),
                nickname: `A${internet.userName()}`,
                email: internet.email(),
                password: internet.password(),
            })),
        ]);

        const famousUser = await User.create({
            uuid: '7d21f121-bed5-4c20-9da5-94746bbc8c08',
            nickname: 'Carole',
            email: 'devessier@devessier.fr',
            password: 'devessierBgDu13',
            confirmedEmailAt: DateTime.now(),
        });

        famousUser.related('followers').saveMany(users);
    }
}
