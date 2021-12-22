import {
    MpeRoomSummary,
    LibraryMpeRoomSearchResponseBody,
} from '@musicroom/types';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import User from 'App/Models/User';

const MpeRoomSearchRequestBody = z.object({
    userID: z.string().uuid(),
});
export type MpeRoomSearchRequestBody = z.infer<typeof MpeRoomSearchRequestBody>;

export default class MpeRoomsHttpController {
    public async listAllUserRooms({
        request,
    }: HttpContextContract): Promise<LibraryMpeRoomSearchResponseBody> {
        const rawBody = request.body();
        //TODO The userID raw in the request body is temporary
        //Later it will be a session cookie to avoid any security issues
        const { userID } = MpeRoomSearchRequestBody.parse(rawBody);

        const user = await User.findOrFail(userID);
        await user.load('mpeRooms', (mpeRoomQuery) => {
            return mpeRoomQuery.preload('creator');
        });

        if (user.mpeRooms !== null) {
            return user.mpeRooms.map<MpeRoomSummary>((room) => ({
                creatorName: room.creator.nickname,
                isInvited: false,
                isOpen: room.isOpen,
                roomID: room.uuid,
                roomName: room.name,
            }));
        }

        return [];
    }
}
