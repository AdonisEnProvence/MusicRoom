import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'dripsy';
import { useActor, useSelector } from '@xstate/react';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MpeTabMpeRoomScreenProps } from '../types';
import { useMusicPlaylistsActor } from '../hooks/useMusicPlaylistsActor';
import { MusicPlaylist } from '../machines/appMusicPlaylistsMachine';

interface MusicPlaylistEditorRoomScreenProps extends MpeTabMpeRoomScreenProps {
    playlist: MusicPlaylist;
}

const MusicPlaylistEditorRoomScreen: React.FC<MusicPlaylistEditorRoomScreenProps> =
    ({ playlist }) => {
        const insets = useSafeAreaInsets();
        const [state] = useActor(playlist.ref);

        return (
            <AppScreen>
                <AppScreenHeader
                    title={`Playlist ${playlist.id}`}
                    insetTop={insets.top}
                />

                <AppScreenContainer>
                    <Text sx={{ color: 'white' }}>{state.value}</Text>
                </AppScreenContainer>
            </AppScreen>
        );
    };

const MusicPlaylistEditorRoomWrapper: React.FC<MpeTabMpeRoomScreenProps> = (
    props,
) => {
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const playlistID = props.route.params.id;
    const playlist = useSelector(appMusicPlaylistsActorRef, (state) =>
        state.context.playlistsActorsRefs.find(({ id }) => id === playlistID),
    );

    if (playlist === undefined) {
        return null;
    }

    return <MusicPlaylistEditorRoomScreen {...props} playlist={playlist} />;
};

export default MusicPlaylistEditorRoomWrapper;
