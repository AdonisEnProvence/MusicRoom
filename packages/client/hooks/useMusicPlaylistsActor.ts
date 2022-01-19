import { useSelector } from '@xstate/react';
import invariant from 'tiny-invariant';
import { useAppContext } from '../contexts/AppContext';
import {
    AppMusicPlaylistsActorRef,
    MusicPlaylist,
} from '../machines/appMusicPlaylistsModel';
import { CreationMpeRoomFormActorRef } from '../machines/creationMpeRoomForm';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';

export function useMusicPlaylistsActor(): {
    appMusicPlaylistsActorRef: AppMusicPlaylistsActorRef;
} {
    const { appMusicPlaylistsActorRef } = useAppContext();
    invariant(
        appMusicPlaylistsActorRef !== undefined,
        'appMusicPlaylistsActorRef is undefined; it needs to be provided before using this hook',
    );

    return {
        appMusicPlaylistsActorRef,
    };
}

export function useMpeRoomCreationFormActor():
    | CreationMpeRoomFormActorRef
    | undefined {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const creationMpeRoomFormActor = useSelector(
        appMusicPlaylistsActorRef,
        (state) =>
            state.children.creationMpeRoomForm as
                | CreationMpeRoomFormActorRef
                | undefined,
    );

    return creationMpeRoomFormActor;
}

export function usePlaylist(roomID: string): MusicPlaylist | undefined {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const playlist = useSelector(appMusicPlaylistsActorRef, (state) =>
        state.context.playlistsActorsRefs.find(({ id }) => id === roomID),
    );
    if (playlist === undefined) {
        return undefined;
    }

    return playlist;
}

export function useExportToMtvRoomCreationFormMachine():
    | CreationMtvRoomFormActorRef
    | undefined {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const creationMtvRoomFormActor = useSelector(
        appMusicPlaylistsActorRef,
        (state) => {
            return state.children.creationMtvRoomForm as
                | CreationMtvRoomFormActorRef
                | undefined;
        },
    );

    return creationMtvRoomFormActor;
}
