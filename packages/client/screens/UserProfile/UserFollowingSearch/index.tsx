import { Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { useActor, useMachine } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native-web-refresh-control';
import { UserFollowingSearchScreenProps } from '../../../types';
import { AppScreenWithSearchBar, Typo } from '../../../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../../machines/appScreenHeaderWithSearchBarMachine';
import { createUserFollowingSearchMachine } from '../../../machines/usersUniversalSearcMachine';
import UserListItem from '../../../components/User/UserListItem';
import { IS_TEST } from '../../../constants/Env';

const UserFollowingSearchScreen: React.FC<UserFollowingSearchScreenProps> = ({
    navigation,
    route,
}) => {
    const { userID: relatedUserID } = route.params;
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;

    const [userFollowingSearchState, userFollowingSearchMachineSend] =
        useMachine(
            createUserFollowingSearchMachine({
                userID: relatedUserID,
            }),
        );
    const { searchQuery, usersSummaries } = userFollowingSearchState.context;
    const hasMoreUsersToFetch = userFollowingSearchState.context.hasMore;
    const isLoadingRooms = userFollowingSearchState.hasTag('fetching');
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = userFollowingSearchState.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');

    function handleLoadMore() {
        userFollowingSearchMachineSend({
            type: 'LOAD_MORE_ITEMS',
        });
    }

    function handleRefresh() {
        userFollowingSearchMachineSend({
            type: 'REFRESH',
        });
    }

    return (
        <AppScreenWithSearchBar
            title="Search for a following"
            testID="search-user-following-screen"
            searchInputPlaceholder="Search a following..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchQuery}
            sendToSearch={sendToSearch}
        >
            <Typo>USER Following SCREEN</Typo>
            <FlatList
                testID="user-following-search-flat-list"
                data={usersSummaries}
                // This is here that we ensure the Flat List will not show items
                // on an unsafe area.
                contentContainerStyle={{
                    paddingBottom: insets.bottom,
                }}
                onEndReachedThreshold={0.5}
                onEndReached={handleLoadMore}
                initialNumToRender={initialNumberOfItemsToRender}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingRooms}
                        onRefresh={handleRefresh}
                    />
                }
                renderItem={({ item: { nickname, userID }, index }) => {
                    const isLastItem = index === usersSummaries.length - 1;

                    return (
                        <View
                            sx={{
                                marginBottom: isLastItem ? undefined : 'm',
                            }}
                        >
                            <UserListItem
                                loading={false}
                                user={{
                                    hasControlAndDelegationPermission: false,
                                    isCreator: false,
                                    isDelegationOwner: false,
                                    isMe: false,
                                    nickname,
                                    userID,
                                }}
                                disabled={false}
                                onPress={() => console.log('user card pressed')}
                            />
                        </View>
                    );
                }}
                keyExtractor={({ userID }) => userID}
                ListEmptyComponent={() => {
                    return (
                        <Text sx={{ color: 'white' }}>
                            This user doesnot have any following
                        </Text>
                    );
                }}
                ListFooterComponent={
                    hasMoreUsersToFetch === true
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
            />
        </AppScreenWithSearchBar>
    );
};

export default UserFollowingSearchScreen;
