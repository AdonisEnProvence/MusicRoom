import React from 'react';
import { Skeleton } from '@motify/skeleton';
import { MpeTabMpeSearchTracksScreenProps } from '../../types';
import { usePlaylist } from '../../hooks/useMusicPlaylistsActor';
import AppSuggestTrackScreen from '../../components/AppSuggestTrackScreen';

const MusicPlaylistEditorSearchTracksScreen: React.FC<MpeTabMpeSearchTracksScreenProps> =
    ({
        navigation,
        route: {
            params: { id: playlistID },
        },
    }) => {
        const playlist = usePlaylist(playlistID);

        if (playlist === undefined) {
            return <Skeleton backgroundColor="dark" show={true} />;
        }
        const playlistActorRef = playlist.ref;

        function handleTracksSelected([trackID]: string[]) {
            playlistActorRef.send({
                type: 'ADD_TRACK',
                trackID,
            });

            exitModal();
        }

        function exitModal() {
            navigation.goBack();
        }

        function handleGoBack() {
            navigation.goBack();
        }

        return (
            <AppSuggestTrackScreen
                screenTitle="Add track"
                onTracksSelected={handleTracksSelected}
                onGoBack={handleGoBack}
            />
        );
    };

export default MusicPlaylistEditorSearchTracksScreen;
