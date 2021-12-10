import { useSelector } from '@xstate/react';
import { useAppContext } from '../contexts/AppContext';
import {
    AppMusicPlaylistsActorRef,
    MusicPlaylist,
} from '../machines/appMusicPlaylistsMachine';

export function useMusicPlaylistsActor(): {
    appMusicPlaylistsActorRef: AppMusicPlaylistsActorRef;
} {
    const { appMusicPlaylistsActorRef } = useAppContext();
    if (appMusicPlaylistsActorRef === undefined) {
        throw new Error(
            'appMusicPlaylistsActorRef is undefined; it needs to be provided before using this hook',
        );
    }

    return {
        appMusicPlaylistsActorRef,
    };
}

export function usePlaylist(roomID: string): MusicPlaylist {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const playlist = useSelector(appMusicPlaylistsActorRef, (state) =>
        state.context.playlistsActorsRefs.find(({ id }) => id === roomID),
    );
    if (playlist === undefined) {
        throw new Error(`Could not find any playlist for roomID: ${roomID}`);
    }

    return playlist;
}
