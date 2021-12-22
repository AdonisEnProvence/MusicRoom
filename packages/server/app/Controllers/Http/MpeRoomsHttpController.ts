import {
    MpeRoomSummary,
    LibraryMpeRoomSearchResponseBody,
    ListAllMpeRoomsResponseBody,
} from '@musicroom/types';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import * as z from 'zod';
import User from 'App/Models/User';
import MpeRoom from 'App/Models/MpeRoom';

const MpeRoomSearchRequestBody = z.object({
    userID: z.string().uuid(),
});
export type MpeRoomSearchRequestBody = z.infer<typeof MpeRoomSearchRequestBody>;

/**
 * @param mpeRooms Should have preloaded creator relationship
 */
function fromMpeRoomToMpeRoomSummary(mpeRooms: MpeRoom[]): MpeRoomSummary[] {
    return mpeRooms.map<MpeRoomSummary>((room) => ({
        creatorName: room.creator.nickname,
        isInvited: false,
        isOpen: room.isOpen,
        roomID: room.uuid,
        roomName: room.name,
    }));
}

export default class MpeRoomsHttpController {
    //TODO should list private with invitation etc etc and takes an userID
    public async listAllRooms(): Promise<ListAllMpeRoomsResponseBody> {
        const allRooms = await MpeRoom.query().preload('creator');

        return fromMpeRoomToMpeRoomSummary(allRooms);
    }

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
            return fromMpeRoomToMpeRoomSummary(user.mpeRooms);
        }

        return [];
    }
}
