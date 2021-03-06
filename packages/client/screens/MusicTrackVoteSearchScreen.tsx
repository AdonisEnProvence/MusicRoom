import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { MtvRoomSummary } from '@musicroom/types';
import { useActor, useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar, Typo } from '../components/kit';
import { IS_TEST } from '../constants/Env';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchMtvRoomsMachine } from '../machines/searchMtvRoomsMachine';
import { MusicTrackVoteSearchScreenProps } from '../types';

type SuggestionListProps = {
    bottomInset: number;
    onSuggestionPress: (id: string) => void;
    hasMoreRoomsToFetch: boolean;
    suggestions: MtvRoomSummary[];
    onEndReached: () => void;
    onLoadMore: () => void;
};

const SuggestionsList: React.FC<SuggestionListProps> = ({
    bottomInset,
    onSuggestionPress,
    hasMoreRoomsToFetch,
    suggestions,
    onEndReached,
    onLoadMore,
}) => {
    const sx = useSx();
    const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;

    const renderItem: ListRenderItem<MtvRoomSummary> = ({
        item: { roomID, roomName, creatorName, isOpen, isInvited },
    }) => (
        <View
            sx={{
                marginBottom: 'm',
            }}
        >
            <TouchableOpacity
                testID={`mtv-room-search-${roomID}`}
                onPress={() => {
                    onSuggestionPress(roomID);
                }}
            >
                <View
                    sx={{
                        flexDirection: 'row',
                        flexShrink: 0,
                        justifyContent: 'space-between',
                    }}
                >
                    <View
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flexShrink: 1,
                        }}
                    >
                        <View
                            sx={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Typo
                                numberOfLines={1}
                                sx={{
                                    fontSize: 's',
                                    flexShrink: 1,
                                }}
                            >
                                {roomName}
                            </Typo>
                            <View
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                {isOpen === true ? (
                                    <>
                                        {isInvited && (
                                            <FontAwesome
                                                name="envelope"
                                                style={sx({
                                                    color: 'greyLighter',
                                                    fontSize: 'm',
                                                    paddingLeft: 'm',
                                                })}
                                                accessibilityLabel={`You're invited to ${roomName}`}
                                            />
                                        )}
                                        <Entypo
                                            name="globe"
                                            style={sx({
                                                color: 'greyLighter',
                                                fontSize: 'm',
                                                paddingLeft: 'm',
                                            })}
                                            accessibilityLabel={`${roomName} is a public room`}
                                        />
                                    </>
                                ) : (
                                    <Entypo
                                        name="lock"
                                        style={sx({
                                            color: 'greyLighter',
                                            fontSize: 'm',
                                            paddingLeft: 'm',
                                        })}
                                        accessibilityLabel={`${roomName} is a private room where you've been invited`}
                                    />
                                )}
                            </View>
                        </View>

                        <Typo
                            numberOfLines={1}
                            sx={{
                                fontSize: 'xs',
                                color: 'greyLighter',
                            }}
                        >
                            {creatorName}
                        </Typo>
                    </View>
                    <View
                        sx={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexShrink: 0,
                            paddingLeft: 'm',
                        }}
                    >
                        <Ionicons
                            name="chevron-forward"
                            style={sx({
                                color: 'greyLighter',
                                fontSize: 'm',
                            })}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <FlatList
            testID="mtv-room-search-flat-list"
            data={suggestions}
            renderItem={renderItem}
            keyExtractor={({ roomID }) => roomID}
            ListEmptyComponent={() => {
                return (
                    <Text sx={{ color: 'white' }}>
                        There are not mtv rooms that match this request
                    </Text>
                );
            }}
            // This is here that we ensure the Flat List will not show items
            // on an unsafe area.
            contentContainerStyle={{
                paddingBottom: bottomInset,
            }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            initialNumToRender={initialNumberOfItemsToRender}
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
                                      onPress={onLoadMore}
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
        />
    );
};

const MusicTrackVoteSearchScreen: React.FC<MusicTrackVoteSearchScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [mtvRoomState, mtvRoomSend] = useMachine(searchMtvRoomsMachine);
    const hasMoreRoomsToFetch = mtvRoomState.context.hasMore;
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = mtvRoomState.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');
    const { sendToMusicPlayerMachine } = useMusicPlayerContext();

    function handleLoadMoreItems() {
        mtvRoomSend({
            type: 'LOAD_MORE_ITEMS',
        });
    }

    return (
        <AppScreenWithSearchBar
            canGoBack
            testID="mtv-room-search-engine"
            title="Track Vote"
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
            <SuggestionsList
                hasMoreRoomsToFetch={hasMoreRoomsToFetch}
                suggestions={mtvRoomState.context.rooms}
                bottomInset={insets.bottom}
                onSuggestionPress={(roomID: string) => {
                    sendToMusicPlayerMachine({
                        type: 'JOIN_ROOM',
                        roomID,
                    });
                }}
                onEndReached={handleLoadMoreItems}
                onLoadMore={handleLoadMoreItems}
            />
        </AppScreenWithSearchBar>
    );
};

export default MusicTrackVoteSearchScreen;
