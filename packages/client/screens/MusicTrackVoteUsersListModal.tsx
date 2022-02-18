import { AntDesign } from '@expo/vector-icons';
import { BottomSheetHandle, BottomSheetModal } from '@gorhom/bottom-sheet';
import { MtvPlayingModes, MtvRoomUsersListElement } from '@musicroom/types';
import { useActor, useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import AppScreenHeaderActionButton from '../components/kit/AppScreenHeaderActionButton';
import MtvRoomUserListElementSettings from '../components/User/MtvRoomUserListElementSettings';
import UserListItemWithThreeDots from '../components/User/UserListItemWithThreeDots';
import { useSocketContext } from '../contexts/SocketContext';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { createRoomUsersListMachine } from '../machines/roomUsersListMachine';
import { assertEventType } from '../machines/utils';
import { MusicTrackVoteUsersListModalProps } from '../types';

interface InviteUserButtonProps {
    testID: string;
    onInviteUser: () => void;
}

export const InviteUserButton: React.FC<InviteUserButtonProps> = ({
    testID,
    onInviteUser,
}) => {
    return (
        <AppScreenHeaderActionButton>
            <TouchableOpacity onPress={onInviteUser}>
                <AntDesign
                    testID={testID}
                    name="adduser"
                    size={24}
                    color="white"
                    accessibilityLabel="Invite a user"
                />
            </TouchableOpacity>
        </AppScreenHeaderActionButton>
    );
};

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
                }).withConfig({
                    actions: {
                        redirectToUserProfile: (_, event) => {
                            assertEventType(event, 'USER_CLICK_ON_USER_CARD');

                            const { userID } = event.pressedUser;
                            navigation.navigate('UserProfile', {
                                screen: 'UserProfileIndex',
                                params: {
                                    userID,
                                },
                            });
                        },
                    },
                }),
            [socket, navigation],
        );
        const [usersListState, sendToUsersListMachine] =
            useMachine(roomUsersListMachine);
        ///

        const { deviceOwnerUser } = usersListState.context;
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
        > = usersListState.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');
        ///

        //Bottom sheet related
        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const snapPoints = [200];

        function handlePresentModalPress(
            selectedUser: MtvRoomUsersListElement,
        ) {
            sendToUsersListMachine({ type: 'SET_SELECTED_USER', selectedUser });
            bottomSheetModalRef.current?.present();
        }

        function handleSheetChanges(index: number) {
            console.log('handleSheetChanges', index);
        }

        function handleGoBack() {
            navigation.goBack();
        }
        ///

        function handleInviteUserButtonPressed() {
            navigation.navigate('MusicTrackVoteUsersSearch', {
                screen: 'MusicTrackVoteUsersSearchModal',
            });
        }

        const searchQueryIsNotEmpty = usersListState.context.searchQuery !== '';

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
                HeaderActionRight={
                    deviceOwnerIsRoomCreator === true ? (
                        <InviteUserButton
                            testID="mtv-invite-user-button"
                            onInviteUser={handleInviteUserButtonPressed}
                        />
                    ) : undefined
                }
            >
                <FlatList
                    data={
                        searchQueryIsNotEmpty
                            ? usersListState.context.filteredUsers
                            : usersListState.context.allUsers
                    }
                    key={'mtv_room_users_list'}
                    keyExtractor={(item) => item.userID}
                    renderItem={({ item, index }) => {
                        const isLastItem =
                            index ===
                            usersListState.context.filteredUsers.length - 1;

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
                                    onPress={() => {
                                        sendToUsersListMachine({
                                            type: 'USER_CLICK_ON_USER_CARD',
                                            pressedUser: item,
                                        });
                                    }}
                                    loading={false}
                                    hideThreeDots={
                                        hideDeviceOwnerUserCardThreeDotsButton ||
                                        hideThreeDots
                                    }
                                    user={item}
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
                        selectedUser={usersListState.context.selectedUser}
                        deviceOwnerUser={usersListState.context.deviceOwnerUser}
                    />
                </BottomSheetModal>
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersListModal;
