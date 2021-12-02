import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'dripsy';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSelector } from '@xstate/react';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MpeTabMpeRoomsScreenProps } from '../types';
import { useMusicPlaylistsActor } from '../hooks/useMusicPlaylistsActor';

interface PlaylistListItemProps {
    id: string;
    roomName: string;
    onPress: (id: string) => void;
}

const PlaylistListItem: React.FC<PlaylistListItemProps> = ({
    id,
    roomName,
    onPress,
}) => {
    return (
        <TouchableOpacity
            onPress={() => {
                onPress(id);
            }}
        >
            <View>
                <Text sx={{ color: 'white' }}>{roomName}</Text>
            </View>
        </TouchableOpacity>
    );
};

const MusicPlaylistEditorListScreen: React.FC<MpeTabMpeRoomsScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const playlists = useSelector(
        appMusicPlaylistsActorRef,
        (state) => state.context.playlistsActorsRefs,
    );

    function handleRoomPress(roomID: string) {
        // navigation.navigate('')
    }

    return (
        <AppScreen>
            <AppScreenHeader title="Library" insetTop={insets.top} />

            <AppScreenContainer>
                <FlatList
                    data={playlists}
                    renderItem={({ item: { id, roomName } }) => {
                        return (
                            <PlaylistListItem
                                id={id}
                                roomName={roomName}
                                onPress={handleRoomPress}
                            />
                        );
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MusicPlaylistEditorListScreen;
