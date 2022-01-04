import { useSelector } from '@xstate/react';
import invariant from 'tiny-invariant';
import { useAppContext } from '../contexts/AppContext';
import {
    AppMusicPlaylistsActorRef,
    MusicPlaylist,
} from '../machines/appMusicPlaylistsMachine';
import { CreationMpeRoomFormActorRef } from '../machines/creationMpeRoomForm';

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
