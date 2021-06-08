import React, { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMachine } from '@xstate/react';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeaderWithSearchBar,
} from '../components/kit';

import { SearchTabSearchTracksScreenProps } from '../types';
import { appScreenHeaderWithSearchBarMachine } from '../machines/appScreenHeaderWithSearchBarMachine';

const SearchTrackScreen: React.FC<SearchTabSearchTracksScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [searchState, sendToSearch] = useMachine(
        appScreenHeaderWithSearchBarMachine,
    );
    const showHeader = searchState.hasTag('showHeaderTitle');
    const [state, send] = useMachine(searchTrackMachine);

    useEffect(() => {
        if (searchState.matches('submitted')) {
            send({
                type: 'SEND_REQUEST',
                searchQuery: searchState.context.searchQuery,
            });
        }
    }, [searchState, send]);

    useEffect(() => {
        if (
            state.matches('fetchedTracks') &&
            state.context.tracks !== undefined
        ) {
            navigation.navigate('SearchTrackResults', {
                tracks: state.context.tracks,
            });
        }
    }, [state, navigation]);

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
