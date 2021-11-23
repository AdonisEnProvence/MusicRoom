import { useActor, useMachine } from '@xstate/react';
import React, { useCallback, useRef, useState } from 'react';
import { Button } from 'react-native';
import { ActorRef } from 'xstate';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreenWithSearchBar } from '../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { SearchTabSearchTracksScreenProps } from '../types';

const SearchTrackScreen: React.FC<SearchTabSearchTracksScreenProps> = ({
    navigation,
}) => {
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state, sendToSearchTracks] = useMachine(searchTrackMachine, {
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
    const isFirstRendering = useRef(true);

    useFocusEffect(
        useCallback(() => {
            if (isFirstRendering.current === true) {
                isFirstRendering.current = false;

                return;
            }

            sendToSearchTracks({
                type: 'RESET',
            });
        }, [sendToSearchTracks]),
    );

    return (
        <AppScreenWithSearchBar
            title="Search a track"
            searchInputPlaceholder="Search a track..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
        >
            <Button
                title="Go to home"
                onPress={() => {
                    navigation.navigate('Home', {
                        screen: 'HomeScreen',
                    });
                }}
            />
        </AppScreenWithSearchBar>
    );
};

export default SearchTrackScreen;
