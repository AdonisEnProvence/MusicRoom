import { useActor, useInterpret, useSelector } from '@xstate/react';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, TouchableOpacity } from 'react-native';
import { Text, useSx, View } from 'dripsy';
import { ActorRef } from 'xstate';
import { createModel } from 'xstate/lib/model';
import invariant from 'tiny-invariant';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenWithSearchBar } from '../components/kit';
import TrackListItem from '../components/Track/TrackListItem';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import {
    SearchTrackActorRef,
    searchTrackMachine,
} from '../machines/searchTrackMachine';
import { SearchTabSearchTracksScreenProps } from '../types';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { useMusicPlaylistsActor } from '../hooks/useMusicPlaylistsActor';

const searchTracksScreenModel = createModel(
    {
        selectedTrackID: undefined as string | undefined,
    },
    {
        events: {
            OPEN_MODAL: (args: { trackID: string }) => args,
            CLOSE_MODAL: () => ({}),

            CREATE_MTV: () => ({}),
            CREATE_MPE: () => ({}),
        },

        actions: {
            forwardMtvCreation: () => ({}),
            forwardMpeCreation: () => ({}),
        },
    },
);

const assignSelectedTrackToContext = searchTracksScreenModel.assign(
    {
        selectedTrackID: (_, event) => event.trackID,
    },
    'OPEN_MODAL',
);

const searchTrackScreenMachine = searchTracksScreenModel.createMachine(
    {
        type: 'parallel',

        states: {
            search: {
                invoke: {
                    id: 'searchTracks',

                    src: searchTrackMachine,
                },
            },

            modal: {
                initial: 'closed',

                states: {
                    closed: {
                        tags: 'hideModal',

                        on: {
                            OPEN_MODAL: {
                                target: 'open',

                                actions: assignSelectedTrackToContext,
                            },
                        },
                    },

                    open: {
                        tags: 'showModal',

                        on: {
                            CLOSE_MODAL: {
                                target: 'closed',

                                actions: searchTracksScreenModel.reset(),
                            },

                            CREATE_MTV: {
                                cond: 'isSelectedTrackIDSet',

                                target: 'closed',

                                actions: 'forwardMtvCreation',
                            },

                            CREATE_MPE: {
                                cond: 'isSelectedTrackIDSet',

                                target: 'closed',

                                actions: 'forwardMpeCreation',
                            },
                        },
                    },
                },
            },
        },
    },
    {
        guards: {
            isSelectedTrackIDSet: (context) =>
                context.selectedTrackID !== undefined,
        },
    },
);

const SearchTrackScreen: React.FC<SearchTabSearchTracksScreenProps> = ({
    navigation,
}) => {
    const sx = useSx();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const { sendToMusicPlayerMachine } = useMusicPlayerContext();
    const { appMusicPlaylistsActorRef } = useMusicPlaylistsActor();
    const searchTrackScreenMachineConfigured = useMemo(() => {
        return searchTrackScreenMachine.withConfig({
            actions: {
                forwardMtvCreation: ({ selectedTrackID }) => {
                    invariant(
                        selectedTrackID !== undefined,
                        'Creating a MTV requires a selected track',
                    );

                    sendToMusicPlayerMachine({
                        type: 'CREATE_ROOM',
                        roomName: selectedTrackID,
                        initialTracksIDs: [selectedTrackID],
                    });
                },

                forwardMpeCreation: ({ selectedTrackID }) => {
                    invariant(
                        selectedTrackID !== undefined,
                        'Creating a MPE requires a selected track',
                    );

                    appMusicPlaylistsActorRef.send({
                        type: 'OPEN_CREATION_FORM',
                        initialTracksIDs: [selectedTrackID],
                    });
                },
            },
        });
    }, [appMusicPlaylistsActorRef, sendToMusicPlayerMachine]);
    const searchTracksScreenService = useInterpret(
        searchTrackScreenMachineConfigured,
    );
    const showModal = useSelector(searchTracksScreenService, (state) =>
        state.hasTag('showModal'),
    );
    const searchTracksActor = useSelector(
        searchTracksScreenService,
        (state) => state.children.searchTracks as SearchTrackActorRef,
    );
    const tracksResults = useSelector(
        searchTracksActor,
        (state) => state.context.tracks,
    );
    const searchBarActor = useSelector(
        searchTracksActor,
        (state) =>
            state.children.searchBarMachine as ActorRef<
                AppScreenHeaderWithSearchBarMachineEvent,
                AppScreenHeaderWithSearchBarMachineState
            >,
    );
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');

    function handleTrackPress(trackID: string) {
        return () => {
            searchTracksScreenService.send({
                type: 'OPEN_MODAL',
                trackID,
            });
        };
    }

    function handleCreateMtvButtonPress() {
        searchTracksScreenService.send({
            type: 'CREATE_MTV',
        });
    }

    function handleCreateMpeButtonPress() {
        searchTracksScreenService.send({
            type: 'CREATE_MPE',
        });
    }

    function handleCloseModalButtonPress() {
        searchTracksScreenService.send({
            type: 'CLOSE_MODAL',
        });
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

            <Modal
                animationType="fade"
                transparent={true}
                visible={showModal}
                onRequestClose={() => {
                    searchTracksScreenService.send({
                        type: 'CLOSE_MODAL',
                    });
                }}
            >
                <View
                    sx={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <View
                        sx={{
                            backgroundColor: 'grey',
                            borderRadius: 's',
                            padding: 'xl',
                            margin: 'm',

                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                        }}
                    >
                        <Text
                            sx={{
                                color: 'white',
                                fontSize: 's',
                                marginTop: 'l',
                                marginBottom: 'l',
                                textAlign: 'center',
                            }}
                        >
                            What do you want to do with this track?
                        </Text>

                        <View
                            sx={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                flex: 1,
                            }}
                        >
                            <TouchableOpacity
                                onPress={handleCreateMtvButtonPress}
                                style={sx({
                                    borderRadius: 'full',
                                    borderWidth: 2,
                                    borderColor: 'secondary',
                                    paddingX: 'l',
                                    paddingY: 's',
                                    margin: 'm',
                                })}
                            >
                                <Text
                                    sx={{
                                        color: 'secondary',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Create MTV
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateMpeButtonPress}
                                style={sx({
                                    borderRadius: 'full',
                                    borderWidth: 2,
                                    borderColor: 'secondary',
                                    paddingX: 'l',
                                    paddingY: 's',
                                    margin: 'm',
                                })}
                            >
                                <Text
                                    sx={{
                                        color: 'secondary',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Create MPE
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={sx({
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                margin: 's',
                                padding: 's',
                            })}
                            onPress={handleCloseModalButtonPress}
                        >
                            <Ionicons
                                name="close"
                                color="white"
                                size={24}
                                accessibilityLabel="Close modal"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AppScreenWithSearchBar>
    );
};

export default SearchTrackScreen;
