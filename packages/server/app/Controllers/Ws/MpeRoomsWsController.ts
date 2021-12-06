import { randomUUID } from 'crypto';
import { MpeCreateWorkflowResponse } from '@musicroom/types';
import { MpeRoomClientToServerCreateArgs } from '@musicroom/types/dist/mpe-room-websockets';
import MpeRoom from 'App/Models/MpeRoom';
import User from 'App/Models/User';
import SocketLifecycle from 'App/Services/SocketLifecycle';
import UserService from 'App/Services/UserService';
import MpeServerToTemporalController from '../Http/Temporal/MpeServerToTemporalController';

interface MpeOnCreateArgs extends MpeRoomClientToServerCreateArgs {
    roomCreator: User;
}

export default class MpeRoomsWsController {
    public static async onCreate(
        args: MpeOnCreateArgs,
    ): Promise<MpeCreateWorkflowResponse> {
        const { roomCreator, ...rest } = args;
        const userID = roomCreator.uuid;

        /**
         * We need to create the room before the workflow
         * because we don't know if temporal will answer faster via the acknowledge
         * mtv room creation activity than adonis will execute this function
         */
        const roomID = randomUUID();
        let roomHasBeenSaved = false;
        const room = new MpeRoom();
        await UserService.joinEveryUserDevicesToRoom(roomCreator, roomID);

        /**
         * Check for room name duplication
         * If room name is found in db
         * Just add creator nickame after the room name
         */
        const roomWithCreatedRoomName = await MpeRoom.findBy('name', args.name);
        const roomNameIsAlreadyTaken = roomWithCreatedRoomName !== null;
        if (roomNameIsAlreadyTaken) {
            args.name = `${args.name} (${roomCreator.nickname})`;
        }
        ///

        try {
            const temporalResponse =
                await MpeServerToTemporalController.createMpeWorkflow({
                    ...rest,
                    workflowID: roomID,
                    userID,
                });

            room.merge({
                uuid: roomID,
                runID: temporalResponse.runID,
                name: args.name,
                //By setting this field lucid will manage the BelongsTo relationship
                creatorID: userID,
                isOpen: args.isOpen,
            });

            await room.save();
            roomHasBeenSaved = true;

            //Will associate both mpe to user and user to mpe relationship
            await room.related('members').save(roomCreator);
            console.log('created mpe room ' + roomID);
            return temporalResponse;
        } catch (error) {
            await SocketLifecycle.deleteSocketIoRoom(roomID);
            if (roomHasBeenSaved) {
                await room.delete();
            }

            console.error(error);
            throw error;
        }
    }
}
