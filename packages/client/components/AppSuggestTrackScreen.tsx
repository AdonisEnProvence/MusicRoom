import { useActor, useMachine } from '@xstate/react';
import { View } from 'dripsy';
import { FlatList } from 'react-native';
import React, { useState } from 'react';
import { ActorRef } from 'xstate';
import TrackListItem from '../components/Track/TrackListItem';
import { AppScreenWithSearchBar } from '../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { assertEventType } from '../machines/utils';

interface AppSuggestTrackScreenProps {
    screenTitle: string;
    onTracksSelected: (tracksIDs: string[]) => void;
    onGoBack: () => void;
    Loader?: React.ReactElement | null;
}

const AppSuggestTrackScreen: React.FC<AppSuggestTrackScreenProps> = ({
    screenTitle,
    onTracksSelected,
    onGoBack,
    Loader,
}) => {
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state, sendToSearchTracks] = useMachine(searchTrackMachine, {
        actions: {
            handleTrackPressed: (_, event) => {
                assertEventType(event, 'PRESS_TRACK');
                const { trackID } = event;

                onTracksSelected([trackID]);
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
            title={screenTitle}
            searchInputPlaceholder="Search a track..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
            goBack={onGoBack}
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

            {Loader}
        </AppScreenWithSearchBar>
    );
};

export default AppSuggestTrackScreen;
