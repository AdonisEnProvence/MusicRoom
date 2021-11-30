import { useActor, useMachine } from '@xstate/react';
import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { View } from 'dripsy';
import { ActorRef } from 'xstate';
import { AppScreenWithSearchBar } from '../components/kit';
import TrackListItem from '../components/Track/TrackListItem';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../machines/searchTrackMachine';
import { SearchTabSearchTracksScreenProps } from '../types';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { assertEventType } from '../machines/utils';

const SearchTrackScreen: React.FC<SearchTabSearchTracksScreenProps> = ({
    navigation,
}) => {
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const { sendToMusicPlayerMachine } = useMusicPlayerContext();
    const [state, sendToSearchTracks] = useMachine(searchTrackMachine, {
        actions: {
            handleTrackPressed: (_, event) => {
                assertEventType(event, 'PRESS_TRACK');
                const { trackID } = event;

                sendToMusicPlayerMachine({
                    type: 'CREATE_ROOM',
                    roomName: trackID,
                    initialTracksIDs: [trackID],
                });
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
            title="Search a track"
            searchInputPlaceholder="Search a track..."
            showHeader={showHeader}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
            setScreenOffsetY={setScreenOffsetY}
            searchQuery={searchState.context.searchQuery}
            sendToSearch={sendToSearch}
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
        </AppScreenWithSearchBar>
    );
};

export default SearchTrackScreen;
