import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { ZodRoomSettings } from '@musicroom/types';
import Ws from 'App/Services/Ws';
import MtvRoom from '../../Models/MtvRoom';

export const getAllRooms = async (): Promise<string[]> => {
    const adapter = Ws.adapter();
    return [...(await adapter.allRooms())] as string[];
};

export default class MtvRoomsHttpController {
    public createRoom({ request }: HttpContextContract): void {
        const body = request.body();
        console.log(body);
        ZodRoomSettings.parse(body);
    }
    public async listAllRooms(): Promise<string[]> {
        //TODO USE POSTGRESS, BELOW IS JUST A TEST HACK/FIX
        const rooms = await MtvRoom.all();
        return rooms.map<string>((room) => room.uuid);
    }
}
