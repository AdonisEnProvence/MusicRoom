import { Button, Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { useActor, useMachine, useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native-web-refresh-control';
import { UserProfileInformation } from '@musicroom/types';
import invariant from 'tiny-invariant';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    AppScreenWithSearchBar,
} from '../../../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../../machines/appScreenHeaderWithSearchBarMachine';
import UserListItem from '../../../components/User/UserListItem';
import { IS_TEST } from '../../../constants/Env';
import { createUserInformationMachine } from '../../../machines/userInformationMachine';
import BlankScreen from '../kit/BlankScreen';
import { createUserFollowingSearchMachine } from '../../../machines/usersUniversalSearcMachine';
import { UserFollowingSearchScreenProps } from '../../../types';
import { useAppContext } from '../../../contexts/AppContext';
import LoadingScreen from '../../kit/LoadingScreen';
import ErrorScreen from '../../kit/ErrorScreen';

const UserfollowingScreen: React.FC<UserFollowingSearchScreenProps> = ({
    navigation,
    route: {
        params: { userID: relatedUserID },
    },
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;
    const { appService } = useAppContext();
    const myUserID = useSelector(
        appService,
        (state) => state.context.myProfileInformation?.userID,
    );
    const [userfollowingSearchState, userfollowingSearchMachineSend] =
        useMachine(() =>
            createUserFollowingSearchMachine({
                userID: relatedUserID,
            }),
        );
    const { usersSummaries } = userfollowingSearchState.context;
    const hasMoreUsersToFetch = userfollowingSearchState.context.hasMore;
    const isFetching = userfollowingSearchState.hasTag('fetching');
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = userfollowingSearchState.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');

    function handleLoadMore() {
        userfollowingSearchMachineSend({
            type: 'LOAD_MORE_ITEMS',
        });
    }

    function handleRefresh() {
        userfollowingSearchMachineSend({
            type: 'REFRESH',
        });
    }

    return (
        <AppScreenWithSearchBar
            canGoBack
            goBack={() => {
                navigation.goBack();
            }}
            title="Search for a following"
            testID="search-user-following-screen"
            searchInputPlaceholder="Search a following..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
        >
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
                        refreshing={isFetching}
                        onRefresh={handleRefresh}
                    />
                }
                renderItem={({ item: { nickname, userID }, index }) => {
                    const isLastItem = index === usersSummaries.length - 1;
                    const isMe = userID === myUserID;
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
                                    isMe,
                                    nickname,
                                    userID,
                                }}
                                disabled={false}
                                onPress={() => {
                                    if (isMe) {
                                        navigation.navigate('MyProfile', {
                                            screen: 'MyProfileIndex',
                                        });
                                    } else {
                                        navigation.navigate(
                                            'UserProfileIndex',
                                            {
                                                userID,
                                            },
                                        );
                                    }
                                }}
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

const UserFollowingSearchScreen: React.FC<UserFollowingSearchScreenProps> = (
    props,
) => {
    const {
        route: {
            params: { userID: relatedUserID },
        },
    } = props;

    const [state] = useMachine(() =>
        createUserInformationMachine(relatedUserID),
    );

    const showBlankScreen = state.matches('Waiting');
    if (showBlankScreen === true) {
        return <BlankScreen />;
    }

    const showLoadingIndicator = state.matches('Show loading indicator');
    if (showLoadingIndicator === true) {
        return (
            <LoadingScreen
                title="Loading user's following"
                testID="search-user-following-screen"
            />
        );
    }

    const userIsUnknown = state.matches('Unknown user');
    if (userIsUnknown === true) {
        return (
            <ErrorScreen
                testID="search-user-following-screen"
                title="User's following"
                message="User not found"
            />
        );
    }

    const userProfileInformation = state.context.userProfileInformation;
    invariant(
        userProfileInformation !== undefined,
        'When the user is known, the user profile information must be defined',
    );

    const accessToUserRelationsIsDisallowed =
        userProfileInformation.followingCounter === undefined;
    if (accessToUserRelationsIsDisallowed === true) {
        return (
            <ErrorScreen
                title={`${userProfileInformation.userNickname}'s following`}
                testID="search-user-following-screen"
                message="Access to user's following is forbidden"
            />
        );
    }

    return <UserfollowingScreen {...props} />;
};

export default UserFollowingSearchScreen;
