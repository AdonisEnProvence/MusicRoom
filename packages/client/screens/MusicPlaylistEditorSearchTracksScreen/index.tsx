import { useActor, useMachine } from '@xstate/react';
import { View } from 'dripsy';
import { FlatList } from 'react-native';
import React, { useState } from 'react';
import { ActorRef } from 'xstate';
import TrackListItem from '../../components/Track/TrackListItem';
import { AppScreenWithSearchBar } from '../../components/kit';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../../machines/appScreenHeaderWithSearchBarMachine';
import { searchTrackMachine } from '../../machines/searchTrackMachine';
import { assertEventType } from '../../machines/utils';
import { MpeTabMpeSearchTracksScreenProps } from '../../types';
import { usePlaylist } from '../../hooks/useMusicPlaylistsActor';

const MusicPlaylistEditorSearchTracksScreen: React.FC<MpeTabMpeSearchTracksScreenProps> =
    ({
        navigation,
        route: {
            params: { id: playlistID },
        },
    }) => {
        const playlist = usePlaylist(playlistID);
        const playlistActorRef = playlist.ref;
        const [screenOffsetY, setScreenOffsetY] = useState(0);
        const [state, sendToSearchTracks] = useMachine(searchTrackMachine, {
            actions: {
                handleTrackPressed: (_, event) => {
                    assertEventType(event, 'PRESS_TRACK');
                    const { trackID } = event;

                    playlistActorRef.send({
                        type: 'ADD_TRACK',
                        trackID,
                    });

                    exitModal();
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
                title="Add Track"
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
                    renderItem={({
                        item: { id, title, artistName },
                        index,
                    }) => (
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

export default MusicPlaylistEditorSearchTracksScreen;
