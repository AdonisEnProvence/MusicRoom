import { useActor, useMachine } from '@xstate/react';
import { ActivityIndicator, View } from 'dripsy';
import { FlatList } from 'react-native';
import React, { useState } from 'react';
import { ActorRef } from 'xstate';
import TrackListItem from '../components/Track/TrackListItem';
import { useSuggestTracks } from '../hooks/musicPlayerHooks';
import { AppScreenWithSearchBar } from '../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { assertEventType } from '../machines/utils';
import { SuggestTrackModalProps } from '../types';

const SuggestTrackModal: React.FC<SuggestTrackModalProps> = ({
    navigation,
}) => {
    const { suggestTracks, showActivityIndicatorOnSuggestionsResultsScreen } =
        useSuggestTracks(exitModal);
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state, sendToSearchTracks] = useMachine(searchTrackMachine, {
        actions: {
            handleTrackPressed: (_, event) => {
                assertEventType(event, 'PRESS_TRACK');
                const { trackID } = event;

                suggestTracks([trackID]);
            },
        },
    });
    const tracksResults = state.context.tracks;
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = state.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');

    function exitModal() {
        navigation.popToTop();
        navigation.goBack();
    }

    function handleGoBack() {
        navigation.goBack();
    }

    function handleTrackPress(trackID: string) {
        return () => {
            sendToSearchTracks({
                type: 'PRESS_TRACK',
                trackID,
            });
        };
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
            <FlatList
                data={tracksResults ?? []}
                renderItem={({ item: { id, title, artistName }, index }) => (
                    <View
                        sx={{
                            marginBottom: 'm',
                        }}
                    >
                        <TrackListItem
                            index={index + 1}
                            title={title}
                            trackID={id}
                            artistName={artistName}
                            onPress={handleTrackPress(id)}
                        />
                    </View>
                )}
                keyExtractor={(_, index) => String(index)}
            />

            {showActivityIndicatorOnSuggestionsResultsScreen === true && (
                <View
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,

                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <ActivityIndicator size="large" />
                </View>
            )}
        </AppScreenWithSearchBar>
    );
};

export default SuggestTrackModal;
