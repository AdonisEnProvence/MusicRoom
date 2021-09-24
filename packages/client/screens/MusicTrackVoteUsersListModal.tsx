import { useActor, useMachine } from '@xstate/react';
import { Text } from 'dripsy';
import React, { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
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
                <Text sx={{ color: 'white' }}>This is the modal</Text>

                <FlatList
                    data={state.context.filteredUsers}
                    renderItem={({ item }) => {
                        return <Text sx={{ color: 'white' }}>{item.id}</Text>;
                    }}
                />
            </AppScreenWithSearchBar>
        );
    };

export default MusicTrackVoteUsersListModal;
