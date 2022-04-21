import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useSx, View } from 'dripsy';
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
import { IS_TEST } from '../../constants/Env';
import { MusicPlaylistEditorRoomSearchResult } from '../../components/MusicPlaylistEditorSearch/MusicPlaylistEditorRoomSearchResult';

const MusicPlaylistEditorRoomsSearchScreen: React.FC<MpeTabMpeRoomsScreenProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const sx = useSx();
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;

        const [mpeRoomSearchState, mpeRoomSearchSend] =
            useMachine(mpeRoomSearchMachine);
        const mpeRooms = mpeRoomSearchState.context.rooms;
        const hasMoreRoomsToFetch = mpeRoomSearchState.context.hasMore;
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = mpeRoomSearchState.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');

        function handleLoadMore() {
            mpeRoomSearchSend({
                type: 'LOAD_MORE_ITEMS',
            });
        }

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
                    data={mpeRooms}
                    renderItem={({ item }) => {
                        return (
                            <MusicPlaylistEditorRoomSearchResult
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
                    ListFooterComponent={
                        hasMoreRoomsToFetch === true
                            ? () => {
                                  return (
                                      <View
                                          sx={{
                                              flexDirection: 'row',
                                              justifyContent: 'center',
                                              alignItems: 'center',
                                          }}
                                      >
                                          <TouchableOpacity
                                              onPress={handleLoadMore}
                                              style={sx({
                                                  borderRadius: 'full',
                                                  borderWidth: 2,
                                                  borderColor: 'secondary',
                                                  paddingX: 'l',
                                                  paddingY: 's',
                                              })}
                                          >
                                              <Text
                                                  sx={{
                                                      color: 'secondary',
                                                      fontWeight: 'bold',
                                                  }}
                                              >
                                                  Load more
                                              </Text>
                                          </TouchableOpacity>
                                      </View>
                                  );
                              }
                            : undefined
                    }
                    // This is here that we ensure the Flat List will not show items
                    // on an unsafe area.
                    contentContainerStyle={{
                        paddingBottom: insets.bottom,
                    }}
                    onEndReachedThreshold={0.5}
                    initialNumToRender={initialNumberOfItemsToRender}
                />
            </AppScreenWithSearchBar>
        );
    };

export default MusicPlaylistEditorRoomsSearchScreen;
