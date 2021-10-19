import { BottomSheetHandle, BottomSheetModal } from '@gorhom/bottom-sheet';
import { MtvPlayingModes, MtvRoomUsersListElement } from '@musicroom/types';
import { useActor, useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import MtvRoomUserListElementSettings from '../components/User/MtvRoomUserListElementSettings';
import UserListItemWithThreeDots from '../components/User/UserListItemWithThreeDots';
import { useSocketContext } from '../contexts/SocketContext';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { createRoomUsersListMachine } from '../machines/roomUsersListMachine';
import { MusicTrackVoteUsersListModalProps } from '../types';

const MusicTrackVoteUsersListModal: React.FC<MusicTrackVoteUsersListModalProps> =
    ({ navigation }) => {
        const sx = useSx();
        const insets = useSafeAreaInsets();
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const socket = useSocketContext();
        const { musicPlayerState, sendToMusicPlayerMachine } =
            useMusicPlayerContext();
        const roomPlayingMode = musicPlayerState.context.playingMode;

        //Init room users list machine
        const roomUsersListMachine = useMemo(
            () =>
                createRoomUsersListMachine({
                    socket,
                }),
            [socket],
        );
        const [state, sendToMachine] = useMachine(roomUsersListMachine);
        ///

        const { deviceOwnerUser } = state.context;
        //Maybe here we should redirect the user to the home if the deviceOwner is not found in the users list ?

        let hideThreeDots = true;

        const deviceOwnerIsRoomCreator =
            deviceOwnerUser !== undefined && deviceOwnerUser.isCreator;
        if (deviceOwnerIsRoomCreator) {
            hideThreeDots = false;
        }

        const roomIsInDirectMode =
            roomPlayingMode === MtvPlayingModes.Values.DIRECT;
        const deviceOwnerHasControlAndDelegationPermissionAndRoomIsInDirectMode =
            deviceOwnerUser !== undefined &&
            deviceOwnerUser.hasControlAndDelegationPermission &&
            roomIsInDirectMode;
        if (deviceOwnerHasControlAndDelegationPermissionAndRoomIsInDirectMode) {
            hideThreeDots = false;
        }

        //Search bar
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = state.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');
        ///

        //Bottom sheet related
        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const snapPoints = [200];

        function handlePresentModalPress(
            selectedUser: MtvRoomUsersListElement,
        ) {
            sendToMachine({ type: 'SET_SELECTED_USER', selectedUser });
            bottomSheetModalRef.current?.present();
        }

        function handleSheetChanges(index: number) {
            console.log('handleSheetChanges', index);
        }

        function handleGoBack() {
            navigation.goBack();
        }
        ///

        const searchQueryIsNotEmpty = state.context.searchQuery !== '';
        return (
            <AppScreenWithSearchBar
                canGoBack
                title="Users list"
                searchInputPlaceholder="Search a user by name..."
                showHeader={showHeader}
                screenOffsetY={showHeader === true ? 0 : screenOffsetY}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToSearch={sendToSearch}
                goBack={handleGoBack}
            >
                <FlatList
                    data={
                        searchQueryIsNotEmpty
                            ? state.context.filteredUsers
                            : state.context.allUsers
                    }
                    key={'mtv_room_users_list'}
                    keyExtractor={(item) => item.userID}
                    renderItem={({ item, index }) => {
                        const isLastItem =
                            index === state.context.filteredUsers.length - 1;

                        const hideDeviceOwnerUserCardThreeDotsButton =
                            deviceOwnerIsRoomCreator &&
                            !roomIsInDirectMode &&
                            item.isMe;

                        return (
                            <View
                                sx={{
                                    marginBottom: isLastItem ? undefined : 'm',
                                }}
                            >
                                <UserListItemWithThreeDots
                                    hideThreeDots={
                                        hideDeviceOwnerUserCardThreeDotsButton ||
                                        hideThreeDots
                                    }
                                    user={item}
                                    index={index}
                                    threeDotsAccessibilityLabel={`Open user ${item.nickname} settings`}
                                    onThreeDotsPress={() =>
                                        handlePresentModalPress(item)
                                    }
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
                />

                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    index={0}
                    snapPoints={snapPoints}
                    onChange={handleSheetChanges}
                    backgroundStyle={sx({
                        backgroundColor: 'greyLight',
                    })}
                    handleComponent={(props) => (
                        <BottomSheetHandle
                            {...props}
                            indicatorStyle={{ backgroundColor: 'white' }}
                        />
                    )}
                >
                    <MtvRoomUserListElementSettings
                        playingMode={roomPlayingMode}
                        setAsDelegationOwner={(user) => {
                            sendToMusicPlayerMachine({
                                type: 'UPDATE_DELEGATION_OWNER',
                                newDelegationOwnerUserID: user.userID,
                            });
                        }}
                        toggleHasControlAndDelegationPermission={(user) => {
                            sendToMusicPlayerMachine({
                                type: 'UPDATE_CONTROL_AND_DELEGATION_PERMISSION',
                                toUpdateUserID: user.userID,
                                hasControlAndDelegationPermission:
                                    !user.hasControlAndDelegationPermission,
                            });
                        }}
                        selectedUser={state.context.selectedUser}
                        deviceOwnerUser={state.context.deviceOwnerUser}
                    />
                </BottomSheetModal>
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersListModal;
