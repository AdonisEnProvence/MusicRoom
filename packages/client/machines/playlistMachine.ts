import { ActorRefFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

const playlistModel = createModel(
    {},
    {
        events: {},
        actions: {},
    },
);

type PlaylistMachine = ReturnType<typeof playlistModel['createMachine']>;

export type PlaylistActorRef = ActorRefFrom<PlaylistMachine>;

interface CreatePlaylistMachineArgs {
    roomID: string;
}

export function createPlaylistMachine({
    roomID,
}: CreatePlaylistMachineArgs): PlaylistMachine {
    return playlistModel.createMachine({});
}
