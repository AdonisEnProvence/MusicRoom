import { useActor, useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import UserListItem from '../components/User/UserListItem';
import { IS_TEST } from '../constants/Env';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { roomUsersSearchMachine } from '../machines/roomUsersSearchMachine';
import { MusicTrackVoteUsersSearchModalProps } from '../types';

const UsersListPlaceholder: React.FC = () => {
    const fakeUsers = Array.from({ length: 3 });

    return (
        <View>
            {fakeUsers.map((_, index) => (
                <View key={index} sx={{ marginBottom: 'm' }}>
                    <UserListItem loading />
                </View>
            ))}
        </View>
    );
};

const MusicTrackVoteUsersSearchModal: React.FC<MusicTrackVoteUsersSearchModalProps> =
    ({ navigation }) => {
        const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;
        const sx = useSx();
        const insets = useSafeAreaInsets();
        const [screenOffsetY, setScreenOffsetY] = useState(0);

        const [state, send] = useMachine(roomUsersSearchMachine);

        //Search bar
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = state.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');
        const searchQueryIsNotEmpty = state.context.searchQuery !== '';
        ///

        function handleGoBack() {
            navigation.goBack();
        }

        const displayFriends = state.hasTag('displayFriends');
        const isLoading = state.hasTag('isLoading');
        const isLoadingMore = state.hasTag('isLoadingMore');
        const usersToDisplay =
            displayFriends === true
                ? state.context.usersFriends
                : state.context.filteredUsers;
        const hasMoreUsersToFetch =
            displayFriends === true
                ? state.context.hasMoreUsersFriendsToFetch
                : state.context.hasMoreFilteredUsersToFetch;
        const showLoadMoreButton = hasMoreUsersToFetch === true;

        function onLoadMore() {
            send({
                type: 'FETCH_MORE',
            });
        }

        return (
            <AppScreenWithSearchBar
                canGoBack
                title="Users search"
                searchInputPlaceholder="Search a user by name..."
                showHeader={showHeader}
                screenOffsetY={showHeader === true ? 0 : screenOffsetY}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToSearch={sendToSearch}
                goBack={handleGoBack}
            >
                {isLoading === true ? (
                    <UsersListPlaceholder />
                ) : (
                    <FlatList
                        data={usersToDisplay}
                        keyExtractor={({ userID }) => userID}
                        renderItem={({ item: { userID, nickname }, index }) => {
                            const isLastItem =
                                index ===
                                state.context.filteredUsers.length - 1;

                            return (
                                <View
                                    sx={{
                                        marginBottom: isLastItem
                                            ? undefined
                                            : 'm',
                                    }}
                                >
                                    <UserListItem
                                        loading={false}
                                        user={{
                                            hasControlAndDelegationPermission:
                                                false,
                                            isCreator: false,
                                            isDelegationOwner: false,
                                            isMe: false,
                                            nickname,
                                            userID,
                                        }}
                                        index={index}
                                    />
                                </View>
                            );
                        }}
                        ListEmptyComponent={() => {
                            return (
                                <Text sx={{ color: 'white' }}>
                                    {searchQueryIsNotEmpty
                                        ? 'There are not users that match this request'
                                        : 'No users found in this room'}
                                </Text>
                            );
                        }}
                        // This is here that we ensure the Flat List will not show items
                        // on an unsafe area.
                        contentContainerStyle={{
                            paddingBottom: insets.bottom,
                        }}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={initialNumberOfItemsToRender}
                        ListFooterComponent={
                            isLoadingMore === true ? (
                                <View sx={{ marginTop: 'm' }}>
                                    <UsersListPlaceholder />
                                </View>
                            ) : showLoadMoreButton === true ? (
                                <View
                                    sx={{
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginTop: 'm',
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
                            ) : undefined
                        }
                    />
                )}
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersSearchModal;