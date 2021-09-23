import { useActor, useMachine } from '@xstate/react';
import { Text } from 'dripsy';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeaderWithSearchBar,
} from '../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { MusicTrackVoteUsersListModalProps } from '../types';

const MusicTrackVoteUsersListModal: React.FC<MusicTrackVoteUsersListModalProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const [state] = useMachine(searchTrackMachine, {
            actions: {
                navigateToResultsPage: ({ tracks }) => {
                    if (tracks === undefined) {
                        return;
                    }

                    // navigation.navigate('SuggestTrackResultsModal', {
                    //     tracks,
                    // });
                },
            },
        });
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
            <AppScreen screenOffsetY={showHeader === true ? 0 : screenOffsetY}>
                <AppScreenHeaderWithSearchBar
                    canGoBack
                    goBack={handleGoBack}
                    title="Users list"
                    searchInputPlaceholder="Search a user by name..."
                    insetTop={insets.top}
                    setScreenOffsetY={setScreenOffsetY}
                    searchQuery={searchState.context.searchQuery}
                    sendToMachine={sendToSearch}
                    showHeader={showHeader}
                />

                <AppScreenContainer>
                    <Text sx={{ color: 'white' }}>This is the modal</Text>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteUsersListModal;
