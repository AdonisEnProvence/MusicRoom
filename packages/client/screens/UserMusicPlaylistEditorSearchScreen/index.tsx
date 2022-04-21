import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, useSx, View } from 'dripsy';
import { FlatList, TouchableOpacity } from 'react-native';
import { useActor, useMachine } from '@xstate/react';
import { ActorRef } from 'xstate';
import { MpeRoomSummary, UserProfileInformation } from '@musicroom/types';
import { RefreshControl } from 'react-native-web-refresh-control';
import invariant from 'tiny-invariant';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    AppScreenWithSearchBar,
} from '../../components/kit';
import { UserMusicPlaylistEditorSearchScreenProps } from '../../types';
import { useMusicPlaylistsActor } from '../../hooks/useMusicPlaylistsActor';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../machines/appScreenHeaderWithSearchBarMachine';
import { createMpeRoomUniversalSearchMachine } from '../../machines/mpeRoomUniversalSearchMachine';
import { IS_TEST } from '../../constants/Env';
import { fetchOtherUserMpeRooms } from '../../services/MpeService';
import { createUserInformationMachine } from '../../machines/userInformationMachine';
import ErrorScreen from '../kit/ErrorScreen';
import LoadingScreen from '../kit/LoadingScreen';
import { MusicPlaylistEditorRoomSearchResult } from '../../components/MusicPlaylistEditorSearch/MusicPlaylistEditorRoomSearchResult';

const BlankScreen: React.FC<UserMusicPlaylistEditorSearchScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader
                title=""
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />
        </AppScreen>
    );
};

const MpeRoomsList: React.FC<
    UserMusicPlaylistEditorSearchScreenProps & {
        userProfileInformation: UserProfileInformation;
    }
> = ({
    route: {
        params: { userID },
    },
    navigation,
    userProfileInformation,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const initialNumberOfItemsToRender = IS_TEST ? Infinity : 10;

    const [libraryRoomState, libraryRoomSend] = useMachine(() => {
        return createMpeRoomUniversalSearchMachine({
            fetchMpeRooms: async ({ searchQuery, page }) => {
                const rooms = await fetchOtherUserMpeRooms({
                    searchQuery,
                    page,
                    userID,
                });

                return rooms;
            },
        });
    });
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
        <AppScreenWithSearchBar
            testID="other-user-mpe-rooms-list"
            title={`${userProfileInformation.userNickname}'s MPE rooms`}
            searchInputPlaceholder="Search a room..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
            canGoBack
            goBack={() => {
                navigation.goBack();
            }}
        >
            <FlatList
                testID="other-user-mpe-room-search-flat-list"
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
                            {searchState.context.searchQuery === ''
                                ? "The user hasn't joined any MPE room yet"
                                : "The user hasn't joined any MPE room matching this query"}
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

const UserMusicPlaylistEditorSearchScreen: React.FC<UserMusicPlaylistEditorSearchScreenProps> =
    (props) => {
        const {
            route: {
                params: { userID },
            },
        } = props;

        const [state] = useMachine(() => createUserInformationMachine(userID));

        const showBlankScreen = state.matches('Waiting');
        if (showBlankScreen === true) {
            return <BlankScreen {...props} />;
        }

        const showLoadingIndicator = state.matches('Show loading indicator');
        if (showLoadingIndicator === true) {
            return (
                <LoadingScreen
                    title="Loading user's MPE rooms"
                    testID="default-profile-page-screen"
                />
            );
        }

        const userIsUnknown = state.matches('Unknown user');
        if (userIsUnknown === true) {
            return (
                <ErrorScreen
                    title="User's MPE rooms"
                    message="User not found"
                />
            );
        }

        const userProfileInformation = state.context.userProfileInformation;
        invariant(
            userProfileInformation !== undefined,
            'When the user is known, the user profile information must be defined',
        );

        const accessToUserPlaylistsIsDisallowed =
            userProfileInformation.playlistsCounter === undefined;
        if (accessToUserPlaylistsIsDisallowed === true) {
            return (
                <ErrorScreen
                    title={`${userProfileInformation.userNickname}'s MPE rooms`}
                    message="Access to user's MPE rooms is forbidden"
                    testID="default-profile-page-screen"
                />
            );
        }

        return (
            <MpeRoomsList
                {...props}
                userProfileInformation={userProfileInformation}
            />
        );
    };

export default UserMusicPlaylistEditorSearchScreen;
