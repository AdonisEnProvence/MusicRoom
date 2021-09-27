import { useActor, useMachine } from '@xstate/react';
import { Text } from 'dripsy';
import React, { useState } from 'react';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { SuggestTrackModalProps } from '../types';

const SuggestTrackModal: React.FC<SuggestTrackModalProps> = ({
    navigation,
}) => {
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state] = useMachine(searchTrackMachine, {
        actions: {
            navigateToResultsPage: ({ tracks }) => {
                if (tracks === undefined) {
                    return;
                }

                navigation.navigate('SuggestTrackResultsModal', {
                    tracks,
                });
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
        <AppScreenWithSearchBar
            canGoBack
            title="Suggest Track"
            searchInputPlaceholder="Search a track..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
            goBack={handleGoBack}
        >
            <Text sx={{ color: 'white' }}>This is the modal</Text>
        </AppScreenWithSearchBar>
    );
};

export default SuggestTrackModal;
