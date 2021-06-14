import React, { useState } from 'react';
import { Button } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import { useMachine, useActor } from '@xstate/react';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeaderWithSearchBar,
} from '../components/kit';
import { SearchTabSearchTracksScreenProps } from '../types';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';

const SearchTrackScreen: React.FC<SearchTabSearchTracksScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state] = useMachine(searchTrackMachine, {
        actions: {
            navigateToResultsPage: ({ tracks }) => {
                if (tracks === undefined) {
                    return;
                }

                navigation.navigate('SearchTrackResults', {
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

    return (
        <AppScreen screenOffsetY={showHeader === true ? 0 : screenOffsetY}>
            <AppScreenHeaderWithSearchBar
                title="Search a track"
                searchInputPlaceholder="Search a track..."
                insetTop={insets.top}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToMachine={sendToSearch}
                showHeader={showHeader}
            />

            <AppScreenContainer>
                <Button
                    title="Go to home"
                    onPress={() => {
                        navigation.navigate('Home', {
                            screen: 'HomeX',
                        });
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default SearchTrackScreen;
