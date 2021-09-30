import { BottomSheetHandle, BottomSheetModal } from '@gorhom/bottom-sheet';
import { MtvRoomUsersListElement } from '@musicroom/types';
import { useActor, useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import MtvRoomUserListElementSetting from '../components/User/MtvRoomUserListElementSettings';
import UserListItemWithThreeDots from '../components/User/UserListItemWithThreeDots';
import { useSocketContext } from '../contexts/SocketContext';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { createRoomUsersListMachine } from '../machines/roomUsersListMachine';
import { MusicTrackVoteUsersListModalProps } from '../types';

const MusicTrackVoteUsersListModal: React.FC<MusicTrackVoteUsersListModalProps> =
    ({ navigation }) => {
        const sx = useSx();
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const socket = useSocketContext();

        //the deviceOnwerUserID will be retrieve in the cookies later with authentification dev
        const roomUsersListMachine = useMemo(
            () =>
                createRoomUsersListMachine({
                    socket,
                }),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [],
        );
        const [state, sendToMachine] = useMachine(roomUsersListMachine);
        const { deviceOwnerUser } = state.context;
        const hideThreeDots =
            deviceOwnerUser === undefined ||
            (deviceOwnerUser !== undefined &&
                !deviceOwnerUser.isCreator &&
                !deviceOwnerUser.hasControlAndDelegationPermission);

        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = state.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');

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
                {state.context.searchQuery !== '' ? (
                    <FlatList
                        data={state.context.filteredUsers}
                        key={'filtered_users_list'}
                        keyExtractor={(item) => item.userID}
                        renderItem={({ item, index }) => {
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
                                    <UserListItemWithThreeDots
                                        hideThreeDots={hideThreeDots}
                                        user={item}
                                        index={index}
                                        threeDotsAccessibilityLabel={`Open user ${item.userID} settings`}
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
                                    There are not users that match this request
                                </Text>
                            );
                        }}
                    />
                ) : (
                    <FlatList
                        key={'not_filtered_users_list'}
                        data={state.context.allUsers}
                        keyExtractor={(item) => item.userID}
                        renderItem={({ item, index }) => {
                            const isLastItem =
                                index === state.context.allUsers.length - 1;

                            return (
                                <View
                                    sx={{
                                        marginBottom: isLastItem
                                            ? undefined
                                            : 'm',
                                    }}
                                >
                                    <UserListItemWithThreeDots
                                        user={item}
                                        hideThreeDots={hideThreeDots}
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
                                    No users found in this room
                                </Text>
                            );
                        }}
                    />
                )}

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
                    <MtvRoomUserListElementSetting
                        setAsDelegationOwner={(user) => {
                            sendToMachine({
                                type: 'SET_AS_DELEGATION_OWNER',
                                userID: user.userID,
                            });
                        }}
                        toggleHasControlAndDelegationPermission={(user) => {
                            sendToMachine({
                                type: 'TOGGLE_CONTROL_AND_DELEGATION_PERMISSION',
                                userID: user.userID,
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
