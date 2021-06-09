import Redis from '@ioc:Adonis/Addons/Redis';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { ZodRoomSettings } from '@musicroom/types';
import Ws from 'App/Services/Ws';

export const getAllRooms = async (): Promise<string[]> => {
    const adapter = Ws.adapter();
    return [...(await adapter.allRooms())] as string[];
};

export default class MTVRoomsController {
    public createRoom({ request }: HttpContextContract): void {
        const body = request.body();
        console.log(body);
        try {
            ZodRoomSettings.parse(body);
        } catch (e) {
            console.log(e);
        }
    }
    public async listAllRooms(): Promise<string[]> {
        //TODO USE POSTGRESS, BELOW IS JUST A TEST HACK/FIX
        return (await Redis.keys('*')) as string[];
    }
}
