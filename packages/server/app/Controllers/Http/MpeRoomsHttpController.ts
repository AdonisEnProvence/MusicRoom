import {
    LibraryMpeRoomSearchResponseBody,
    ListAllMpeRoomsResponseBody,
    MpeRoomSearchRequestBody,
} from '@musicroom/types';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import User from 'App/Models/User';
import MpeRoom from 'App/Models/MpeRoom';
import { datatype } from 'faker';
import { fromMpeRoomsToMpeRoomSummaries } from '../Ws/MpeRoomsWsController';

export default class MpeRoomsHttpController {
    //TODO should list private with invitation etc etc and takes an userID
    public async listAllRooms(): Promise<ListAllMpeRoomsResponseBody> {
        const allRooms = await MpeRoom.query().preload('creator');

        return await fromMpeRoomsToMpeRoomSummaries({
            mpeRooms: allRooms,
            userID: datatype.uuid(), //TODO this is temporary we need to be refactor during mpe search engine implem
        });
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
            return await fromMpeRoomsToMpeRoomSummaries({
                mpeRooms: user.mpeRooms,
                userID: datatype.uuid(), //TODO this is temporary we need to be refactor during mpe search engine implem
            });
        }

        return [];
    }
}
