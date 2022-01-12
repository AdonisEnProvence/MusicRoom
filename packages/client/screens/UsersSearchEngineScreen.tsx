import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { assertEventType } from '../machines/utils';

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

const UserListItemInvitedActions = () => {
    const sx = useSx();

    return (
        <View accessibilityLabel="Has been invited">
            <Ionicons
                name="checkmark"
                size={20}
                style={sx({
                    color: 'secondary',
                })}
            />
        </View>
    );
};

interface UsersSearchEngineProps {
    onUserCardPress: (userID: string) => void;
}

/**
 * From now this "screen" is only used inside other wrapping other screen
 * Calling it screen and leaving the file here because it's returning an AppScreenHeader
 */
const UsersSearchEngineScreen: React.FC<UsersSearchEngineProps> = ({
    onUserCardPress,
}) => {
    const navigation = useNavigation();
    const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;
    const sx = useSx();
    const insets = useSafeAreaInsets();
    const [screenOffsetY, setScreenOffsetY] = useState(0);

    const [state, send] = useMachine(roomUsersSearchMachine, {
        actions: {
            userHasBeenSelected: (_, event) => {
                assertEventType(event, 'SELECT_USER');

                const { userID } = event;

                onUserCardPress(userID);
            },
        },
    });

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
    const selectedUsers = state.context.selectedUsers;
    const usersToDisplay =
        displayFriends === true
            ? state.context.usersFriends
            : state.context.filteredUsers;
    const usersToDisplayWithDisabling = usersToDisplay.map((user) => {
        const hasAlreadyBeenInvited = selectedUsers.some(
            (selectedUserID) => selectedUserID === user.userID,
        );
        const disabled = hasAlreadyBeenInvited === true;

        return {
            ...user,
            disabled,
        };
    });
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

    function handleUserCardPressed(userID: string) {
        return () => {
            send({
                type: 'SELECT_USER',
                userID,
            });
        };
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
                    data={usersToDisplayWithDisabling}
                    keyExtractor={({ userID }) => userID}
                    renderItem={({
                        item: { userID, nickname, disabled },
                        index,
                    }) => {
                        const isLastItem =
                            index === state.context.filteredUsers.length - 1;

                        const Actions =
                            disabled === true
                                ? UserListItemInvitedActions
                                : undefined;

                        return (
                            <View
                                sx={{
                                    marginBottom: isLastItem ? undefined : 'm',
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
                                    disabled={disabled}
                                    index={index}
                                    Actions={Actions}
                                    onPress={handleUserCardPressed(userID)}
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

export default UsersSearchEngineScreen;
