import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { ZodRoomSettings } from '@musicroom/types';

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
}
