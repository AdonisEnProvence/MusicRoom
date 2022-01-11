import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'dripsy';
import { FlatList, TouchableOpacity } from 'react-native';
import { useActor, useMachine } from '@xstate/react';
import { ActorRef } from 'xstate';
import { MpeRoomSummary } from '@musicroom/types';
import { AppScreenWithSearchBar } from '../../components/kit';
import { MpeTabMpeRoomsScreenProps } from '../../types';
import { useMusicPlaylistsActor } from '../../hooks/useMusicPlaylistsActor';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../machines/appScreenHeaderWithSearchBarMachine';
import { mpeRoomSearchMachine } from '../../machines/mpeRoomUniversalSearchMachine';

interface PlaylistListItemProps {
    roomSummary: MpeRoomSummary;
    onPress: (roomSummary: MpeRoomSummary) => void;
}

const PlaylistListItem: React.FC<PlaylistListItemProps> = ({
    roomSummary,
    onPress,
}) => {
    const { roomID, roomName } = roomSummary;
    return (
        <TouchableOpacity
            testID={`mpe-room-card-${roomID}`}
            onPress={() => {
                onPress(roomSummary);
            }}
        >
            <View>
                <Text sx={{ color: 'white' }}>{roomName}</Text>
            </View>
        </TouchableOpacity>
    );
};

const MusicPlaylistEditorRoomsSearchScreen: React.FC<MpeTabMpeRoomsScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const [screenOffsetY, setScreenOffsetY] = useState(0);

        //Library Search machine
        const [libraryRoomState] = useMachine(mpeRoomSearchMachine);
        const hasMoreRoomsToFetch = false;
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = libraryRoomState.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');
        ///

        const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
        function handleRoomPress({ roomID, roomName }: MpeRoomSummary) {
            appMusicPlaylistsActorRef.send({
                type: 'DISPLAY_MPE_ROOM_VIEW',
                roomID,
                roomName,
            });
        }

        return (
            <AppScreenWithSearchBar
                canGoBack
                testID="mpe-room-search-engine"
                title="Playlist Editor"
                searchInputPlaceholder="Search a room..."
                showHeader={showHeader}
                screenOffsetY={showHeader === true ? 0 : screenOffsetY}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToSearch={sendToSearch}
                goBack={() => {
                    navigation.goBack();
                }}
            >
                <FlatList
                    testID="library-mpe-room-search-flat-list"
                    data={libraryRoomState.context.rooms}
                    renderItem={({ item }) => {
                        return (
                            <PlaylistListItem
                                roomSummary={item}
                                onPress={handleRoomPress}
                            />
                        );
                    }}
                    keyExtractor={({ roomID }) => roomID}
                    ListEmptyComponent={() => {
                        return (
                            <Text sx={{ color: 'white' }}>
                                Couldn't find any mpe rooms
                            </Text>
                        );
                    }}
                    // This is here that we ensure the Flat List will not show items
                    // on an unsafe area.
                    contentContainerStyle={{
                        paddingBottom: insets.bottom,
                    }}
                    onEndReachedThreshold={0.5}
                    initialNumToRender={10}
                />
            </AppScreenWithSearchBar>
        );
    };

export default MusicPlaylistEditorRoomsSearchScreen;