import Ws from 'App/Services/Ws';
import MtvRoom from '../../Models/MtvRoom';

export const getAllRooms = async (): Promise<string[]> => {
    const adapter = Ws.adapter();
    return [...(await adapter.allRooms())] as string[];
};

export default class MtvRoomsHttpController {
    public async listAllRooms(): Promise<string[]> {
        const rooms = await MtvRoom.all();
        return rooms.map<string>((room) => room.uuid);
    }
}
