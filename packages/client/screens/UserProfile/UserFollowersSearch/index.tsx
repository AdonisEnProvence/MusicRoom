import { Button, Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { useActor, useMachine, useSelector } from '@xstate/react';
import { FlatList, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native-web-refresh-control';
import { UserProfileInformation } from '@musicroom/types';
import invariant from 'tiny-invariant';
import { UserFollowersSearchScreenProps } from '../../../types';
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
import { createUserFollowersSearchMachine } from '../../../machines/usersUniversalSearcMachine';
import UserListItem from '../../../components/User/UserListItem';
import { IS_TEST } from '../../../constants/Env';
import { createUserInformationMachine } from '../../../machines/userInformationMachine';
import UserNotFoundScreen from '../kit/UserNotFound';
import BlankScreen from '../kit/BlankScreen';
import LoadingScreen from '../kit/LoadingScreen';
import { useAppContext } from '../../../contexts/AppContext';

const ForbiddenAccessToUserFollowersScreen: React.FC<
    UserFollowersSearchScreenProps & {
        userProfileInformation: UserProfileInformation;
    }
> = ({ navigation, userProfileInformation: { userNickname } }) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader
                title={`${userNickname}'s followers`}
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer testID="search-user-followers-screen">
                <Text sx={{ color: 'white', marginBottom: 'xl' }}>
                    Access to user's followers is forbidden
                </Text>

                <Button title="Go back" onPress={() => navigation.goBack()} />
            </AppScreenContainer>
        </AppScreen>
    );
};

const UserFollowersScreen: React.FC<UserFollowersSearchScreenProps> = ({
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
    const meUSerID = useSelector(appService, (state) => state.context.userID);
    const [userFollowersSearchState, userFollowersSearchMachineSend] =
        useMachine(() =>
            createUserFollowersSearchMachine({
                userID: relatedUserID,
            }),
        );
    const { usersSummaries } = userFollowersSearchState.context;
    const hasMoreUsersToFetch = userFollowersSearchState.context.hasMore;
    const isFetching = userFollowersSearchState.hasTag('fetching');
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = userFollowersSearchState.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');

    function handleLoadMore() {
        userFollowersSearchMachineSend({
            type: 'LOAD_MORE_ITEMS',
        });
    }

    function handleRefresh() {
        userFollowersSearchMachineSend({
            type: 'REFRESH',
        });
    }

    return (
        <AppScreenWithSearchBar
            canGoBack
            goBack={() => {
                navigation.goBack();
            }}
            title="Search for a follower"
            testID="search-user-followers-screen"
            searchInputPlaceholder="Search a follower..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
        >
            <FlatList
                testID="user-followers-search-flat-list"
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
                    const isMe = userID === meUSerID;
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
                            This user doesnot have any followers
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

const UserFollowersSearchScreen: React.FC<UserFollowersSearchScreenProps> = (
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
                title="Loading user's followers"
                testID="search-user-followers-screen"
            />
        );
    }

    const userIsUnknown = state.matches('Unknown user');
    if (userIsUnknown === true) {
        return (
            <UserNotFoundScreen
                testID="search-user-followers-screen"
                title="User's followers"
            />
        );
    }

    const userProfileInformation = state.context.userProfileInformation;
    invariant(
        userProfileInformation !== undefined,
        'When the user is known, the user profile information must be defined',
    );

    const accessToUserRelationsIsDisallowed =
        userProfileInformation.followersCounter === undefined;
    if (accessToUserRelationsIsDisallowed === true) {
        return (
            <ForbiddenAccessToUserFollowersScreen
                {...props}
                userProfileInformation={userProfileInformation}
            />
        );
    }

    return <UserFollowersScreen {...props} />;
};

export default UserFollowersSearchScreen;
