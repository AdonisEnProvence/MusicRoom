import { useAppContext } from '../contexts/AppContext';
import { AppMusicPlaylistsActorRef } from '../machines/appMusicPlaylistsMachine';

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
