import { useActor, useMachine } from '@xstate/react';
import { Text, View } from 'dripsy';
import React, { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import UserListItemWithThreeDots from '../components/User/UserListItemWithThreeDots';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { createSearchUserMachine } from '../machines/searchUserMachine';
import { MusicTrackVoteUsersListModalProps } from '../types';

const MusicTrackVoteUsersListModal: React.FC<MusicTrackVoteUsersListModalProps> =
    ({ navigation }) => {
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const searchUserMachine = useMemo(
            () =>
                createSearchUserMachine({
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
        const [state] = useMachine(searchUserMachine);
        const searchBarActor: ActorRef<
            AppScreenHeaderWithSearchBarMachineEvent,
            AppScreenHeaderWithSearchBarMachineState
        > = state.children.searchBarMachine;
        const [searchState, sendToSearch] = useActor(searchBarActor);
        const showHeader = searchState.hasTag('showHeaderTitle');

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
                                    onThreeDotsPress={() => {
                                        console.log('three dots clicked');
                                    }}
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
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersListModal;
