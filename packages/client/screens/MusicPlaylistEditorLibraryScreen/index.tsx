import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useSx, View } from 'dripsy';
import { FlatList, TouchableOpacity } from 'react-native';
import { useActor, useMachine } from '@xstate/react';
import { ActorRef } from 'xstate';
import { MpeRoomSummary } from '@musicroom/types';
import { RefreshControl } from 'react-native-web-refresh-control';
import { MpeTabMpeRoomsScreenProps } from '../../types';
import { useMusicPlaylistsActor } from '../../hooks/useMusicPlaylistsActor';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../machines/appScreenHeaderWithSearchBarMachine';
import { libraryMpeRoomSearchMachine } from '../../machines/mpeRoomUniversalSearchMachine';
import { IS_TEST } from '../../constants/Env';
import AppScreenWithMenuWithSearchBar from '../../components/kit/AppScreenWithMenuWithSearchBar';
import { MusicPlaylistEditorRoomSearchResult } from '../../components/MusicPlaylistEditorSearch/MusicPlaylistEditorRoomSearchResult';

const MusicPlaylistEditorListScreen: React.FC<MpeTabMpeRoomsScreenProps> =
    () => {
        const insets = useSafeAreaInsets();
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const sx = useSx();
        const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;

        const [libraryRoomState, libraryRoomSend] = useMachine(
            libraryMpeRoomSearchMachine,
        );
        const mpeRooms = libraryRoomState.context.rooms;
        const hasMoreRoomsToFetch = libraryRoomState.context.hasMore;
        const isLoadingRooms = libraryRoomState.hasTag('fetching');
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = libraryRoomState.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');

        function handleLoadMore() {
            libraryRoomSend({
                type: 'LOAD_MORE_ITEMS',
            });
        }

        function handleRefresh() {
            libraryRoomSend({
                type: 'REFRESH',
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
            <AppScreenWithMenuWithSearchBar
                testID="library-mpe-rooms-list"
                title="Your library"
                searchInputPlaceholder="Search a room..."
                showHeader={showHeader}
                screenOffsetY={showHeader === true ? 0 : screenOffsetY}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToSearch={sendToSearch}
            >
                <FlatList
                    testID="library-mpe-room-search-flat-list"
                    data={mpeRooms}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingRooms}
                            onRefresh={handleRefresh}
                        />
                    }
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
                                You have not joined any MPE rooms
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
                    onEndReached={handleLoadMore}
                    initialNumToRender={initialNumberOfItemsToRender}
                />
            </AppScreenWithMenuWithSearchBar>
        );
    };

export default MusicPlaylistEditorListScreen;
