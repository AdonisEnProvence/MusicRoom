import { useActor, useMachine } from '@xstate/react';
import { Text, View, useSx } from 'dripsy';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Switch, TouchableOpacity } from 'react-native';
import { ActorRef } from 'xstate';
import { BottomSheetModal, BottomSheetHandle } from '@gorhom/bottom-sheet';
import { AppScreenWithSearchBar } from '../components/kit';
import UserListItemWithThreeDots from '../components/User/UserListItemWithThreeDots';
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
        const roomUsersListMachine = useMemo(
            () =>
                createRoomUsersListMachine({
                    users: [
                        {
                            id: 'Baptiste',
                        },
                        {
                            id: 'Biolay',
                        },
                        {
                            id: 'Christophe',
                        },
                    ],
                }),
            [],
        );
        const [state] = useMachine(roomUsersListMachine);
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = state.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');

        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const snapPoints = [200];

        function handlePresentModalPress() {
            bottomSheetModalRef.current?.present();
        }

        function handleSheetChanges(index: number) {
            console.log('handleSheetChanges', index);
        }

        function handleGoBack() {
            navigation.goBack();
        }

        const [hasPermission, setHasPermission] = useState(false);

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
                    data={state.context.filteredUsers}
                    renderItem={({ item, index }) => {
                        const isLastItem =
                            index === state.context.filteredUsers.length - 1;

                        return (
                            <View
                                sx={{
                                    marginBottom: isLastItem ? undefined : 'm',
                                }}
                            >
                                <UserListItemWithThreeDots
                                    index={index}
                                    name={item.id}
                                    threeDotsAccessibilityLabel={`Open user ${item.id} settings`}
                                    onThreeDotsPress={handlePresentModalPress}
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
                    <View
                        sx={{
                            flex: 1,
                            padding: 'm',
                            alignItems: 'center',
                        }}
                    >
                        <View
                            sx={{
                                maxWidth: [undefined, 500],
                                width: '100%',
                            }}
                        >
                            <Text
                                sx={{
                                    color: 'white',
                                    marginBottom: 'l',
                                    textAlign: 'center',
                                }}
                            >
                                Biolay77 settings
                            </Text>

                            <View
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    sx={{
                                        marginRight: 'l',
                                        color: 'white',
                                    }}
                                >
                                    Has Delegation and Control permission?
                                </Text>

                                <Switch
                                    value={hasPermission}
                                    onValueChange={setHasPermission}
                                    accessibilityLabel={`${
                                        hasPermission === true
                                            ? 'Remove'
                                            : 'Set'
                                    } delegation and control permission`}
                                />
                            </View>

                            <View sx={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    style={sx({ flex: 1, marginTop: 'l' })}
                                >
                                    <View
                                        sx={{
                                            padding: 's',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 's',
                                            backgroundColor: 'greyLighter',
                                        }}
                                    >
                                        <Text
                                            sx={{
                                                fontSize: 's',
                                                color: 'white',
                                            }}
                                        >
                                            Make delegator
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </BottomSheetModal>
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersListModal;
