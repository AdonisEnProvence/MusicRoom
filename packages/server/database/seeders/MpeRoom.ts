import BaseSeeder from '@ioc:Adonis/Lucid/Seeder';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import { datatype, internet } from 'faker';

export default class MpeRoomSeeder extends BaseSeeder {
    public static developmentOnly = true;

    public async run(): Promise<void> {
        const creator = await User.create({
            uuid: datatype.uuid(),
            nickname: internet.userName(),
            email: internet.email(),
            password: internet.password(),
        });

        const uniqueKey = 'uuid';

        const getFakeRoom = (): {
            creatorID: string;
            uuid: string;
            runID: string;
            isOpen: boolean;
            name: string;
        } => {
            return {
                creatorID: creator.uuid,
                uuid: datatype.uuid(),
                runID: datatype.uuid(),
                isOpen: true,
                name: datatype.uuid(),
            };
        };
        const rooms = Array.from({ length: 50 }).map(getFakeRoom);

        await MpeRoom.updateOrCreateMany(uniqueKey, [
            {
                creatorID: creator.uuid,
                uuid: 'dfe852e4-28e8-4616-8428-ba18d2c8052e',
                runID: 'dfe852e4-28e8-4616-8428-ba18d2c8052e',
                isOpen: true,
                name: 'BB Brunes Fans',
            },
            {
                creatorID: creator.uuid,
                uuid: '0287f203-44a0-4170-9dd3-f220e925333e',
                runID: '0287f203-44a0-4170-9dd3-f220e925333e',
                isOpen: false,
                name: 'Biolay Fans',
            },
            {
                creatorID: creator.uuid,
                uuid: '70638715-896e-4dca-af1a-2b38e9cb9562',
                runID: '70638715-896e-4dca-af1a-2b38e9cb9562',
                isOpen: true,
                name: 'Bashung Fans',
            },
            {
                creatorID: creator.uuid,
                uuid: '6988727c-13a8-4e00-b65c-194820e7bb1f',
                runID: '6988727c-13a8-4e00-b65c-194820e7bb1f',
                isOpen: true,
                name: 'U2 Fans',
            },
            {
                creatorID: creator.uuid,
                uuid: 'edf78de1-0b95-47e8-b2d8-1209ac3b776a',
                runID: 'edf78de1-0b95-47e8-b2d8-1209ac3b776a',
                isOpen: true,
                name: 'Feu! Chatterton Fans',
            },
            {
                creatorID: creator.uuid,
                uuid: 'cf372d4b-0998-4ae0-a81c-ceed5ab01a0f',
                runID: 'cf372d4b-0998-4ae0-a81c-ceed5ab01a0f',
                isOpen: false,
                name: 'Random Electro',
            },
            ...rooms,
        ]);
    }
}
