import { Ionicons } from '@expo/vector-icons';
import { TrackMetadataWithScore } from '@musicroom/types';
import { useNavigation } from '@react-navigation/native';
import { useMachine } from '@xstate/react';
import { Text, useSx, View } from 'dripsy';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import {
    AppUserMachineEvent,
    AppUserMachineState,
} from '../../machines/appUserMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import TrackListItemWithScore from '../Track/TrackListItemWithScore';
import { MusicPlayerRef } from './Player';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    machineState: AppMusicPlayerMachineState;
    dismissFullScreenPlayer: () => void;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    sendToUserMachine: Sender<AppUserMachineEvent>;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    isDeviceEmitting: () => boolean;
    userState: AppUserMachineState;
};

const fullscreenPlayerTabsMachineModel = createModel(
    {},
    {
        events: {
            GO_TO_TRACKS: () => ({}),

            GO_TO_CHAT: () => ({}),

            GO_TO_SETTINGS: () => ({}),
        },
    },
);

const fullscreenPlayerTabsMachine =
    fullscreenPlayerTabsMachineModel.createMachine({
        initial: 'tracks',

        states: {
            tracks: {
                on: {
                    GO_TO_CHAT: {
                        target: 'chat',
                    },
                    GO_TO_SETTINGS: {
                        target: 'settings',
                    },
                },
            },

            chat: {
                on: {
                    GO_TO_TRACKS: {
                        target: 'tracks',
                    },
                    GO_TO_SETTINGS: {
                        target: 'settings',
                    },
                },
            },

            settings: {
                on: {
                    GO_TO_TRACKS: {
                        target: 'tracks',
                    },
                    GO_TO_CHAT: {
                        target: 'chat',
                    },
                },
            },
        },
    });

interface Tab {
    text: string;
    selected: boolean;
    onPress: () => void;
    component: () => React.ReactElement | null;
}

interface AddSongButtonProps {
    onPress: () => void;
}

const AddSongButton: React.FC<AddSongButtonProps> = ({ onPress }) => {
    const sx = useSx();
    return (
        <TouchableOpacity
            style={sx({
                position: 'absolute',
                right: 0,
                bottom: 0,
                borderRadius: 'full',
                backgroundColor: 'secondary',
                width: 48,
                height: 48,
                margin: 'm',
                justifyContent: 'center',
                alignItems: 'center',

                // Copy pasted from https://ethercreative.github.io/react-native-shadow-generator/
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,

                elevation: 5,
            })}
            onPress={onPress}
        >
            <Ionicons
                accessibilityLabel="Suggest a track"
                name="add"
                size={32}
                color="white"
                style={{
                    // Necessary to center the icon visually
                    right: -1,
                }}
            />
        </TouchableOpacity>
    );
};

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    machineState,
    dismissFullScreenPlayer,
    sendToMachine,
    sendToUserMachine,
    setPlayerRef,
    isDeviceEmitting,
    userState,
}) => {
    // TODO: replace the hook by a prop
    const navigation = useNavigation();
    const sx = useSx();
    const context = machineState.context;
    const userContext = userState.context;

    const insets = useSafeAreaInsets();
    const isPlaying = machineState.hasTag('playerOnPlay');
    const roomIsReady = machineState.hasTag('roomIsReady');
    const [tabsState, tabsSend] = useMachine(fullscreenPlayerTabsMachine);
    const tabs: Tab[] = [
        {
            text: 'Tracks',
            selected: tabsState.matches('tracks'),
            onPress: () => {
                tabsSend({
                    type: 'GO_TO_TRACKS',
                });
            },
            component: () => {
                if (context.tracks === null) {
                    return null;
                }

                function generateTracksListItems(): (
                    | { type: 'TRACK'; track: TrackMetadataWithScore }
                    | { type: 'SEPARATOR' }
                )[] {
                    if (context.tracks === null) {
                        return [];
                    }

                    const formattedTracksListItem = context.tracks.map<{
                        type: 'TRACK';
                        track: TrackMetadataWithScore;
                    }>((track) => ({
                        type: 'TRACK',
                        track,
                    }));
                    const firstSuggestedTrackIndex = context.tracks.findIndex(
                        (track) => track.score < context.minimumScoreToBePlayed,
                    );

                    if (
                        firstSuggestedTrackIndex === -1 ||
                        firstSuggestedTrackIndex === context.tracks.length - 1
                    ) {
                        return formattedTracksListItem;
                    }

                    return [
                        ...formattedTracksListItem.slice(
                            0,
                            firstSuggestedTrackIndex,
                        ),
                        {
                            type: 'SEPARATOR',
                        },
                        ...formattedTracksListItem.slice(
                            firstSuggestedTrackIndex,
                        ),
                    ];
                }

                const data = generateTracksListItems();

                return (
                    <View sx={{ flex: 1 }}>
                        <FlatList
                            data={data}
                            renderItem={({ item, index }) => {
                                if (item.type === 'SEPARATOR') {
                                    return (
                                        <View
                                            sx={{
                                                height: 1,
                                                width: '100%',
                                                backgroundColor: 'white',

                                                marginBottom: 'm',
                                            }}
                                        />
                                    );
                                }

                                const {
                                    title,
                                    artistName,
                                    id: trackID,
                                } = item.track;
                                let userHasAlreadyVotedForTrack = false;
                                if (context.userRelatedInformation !== null) {
                                    userHasAlreadyVotedForTrack =
                                        context.userRelatedInformation.tracksVotedFor.some(
                                            (trackIDVotedFor) =>
                                                trackIDVotedFor === trackID,
                                        );
                                }

                                return (
                                    <View
                                        sx={{
                                            marginBottom: 'm',
                                        }}
                                    >
                                        <TrackListItemWithScore
                                            index={index + 1}
                                            title={title}
                                            artistName={artistName}
                                            score={item.track.score}
                                            minimumScore={
                                                context.minimumScoreToBePlayed
                                            }
                                            disabled={
                                                userHasAlreadyVotedForTrack
                                            }
                                            onPress={() => {
                                                sendToMachine({
                                                    type: 'VOTE_FOR_TRACK',
                                                    trackID,
                                                });
                                            }}
                                        />
                                    </View>
                                );
                            }}
                            extraData={context}
                            keyExtractor={(_, index) => String(index)}
                            style={{ flex: 1 }}
                        />

                        <AddSongButton
                            onPress={() => {
                                navigation.navigate('SuggestTrack');
                            }}
                        />
                    </View>
                );
            },
        },
        {
            text: 'Chat',
            selected: tabsState.matches('chat'),
            onPress: () => {
                tabsSend({
                    type: 'GO_TO_CHAT',
                });
            },
            component: () => (
                <View>
                    <Text sx={{ color: 'white' }}>
                        Welcome to our great Chat You have{' '}
                        {userContext.devices.length} connected devices
                    </Text>
                    {userContext.devices.length > 0 && (
                        <FlatList
                            data={userContext.devices}
                            renderItem={({ item: { deviceID, name } }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        sendToMachine({
                                            type: 'CHANGE_EMITTING_DEVICE',
                                            deviceID,
                                        });
                                    }}
                                >
                                    <Text
                                        sx={{
                                            color: 'white',
                                        }}
                                    >
                                        {name}{' '}
                                        {deviceID ===
                                        context.userRelatedInformation
                                            ?.emittingDeviceID
                                            ? 'EMITTING'
                                            : ''}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(_, index) => String(index)}
                        />
                    )}
                </View>
            ),
        },
        {
            text: 'Settings',
            selected: tabsState.matches('settings'),
            onPress: () => {
                tabsSend({
                    type: 'GO_TO_SETTINGS',
                });
            },
            component: () => (
                <View>
                    <Text sx={{ color: 'white' }}>
                        Welcome to settings tab{' '}
                    </Text>
                    {context.hasTimeAndPositionConstraints && (
                        <TouchableOpacity
                            onPress={() => {
                                sendToUserMachine({
                                    type: 'REQUEST_DEDUPLICATE_LOCATION_PERMISSION',
                                });
                            }}
                            style={sx({
                                backgroundColor: 'secondary',
                                padding: 'l',
                                borderRadius: 's',
                                textAlign: 'center',
                            })}
                        >
                            <Text>REQUEST LOCATION</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => {
                            sendToMachine({
                                type: 'LEAVE_ROOM',
                            });
                        }}
                        style={sx({
                            backgroundColor: '#8B0000',
                            padding: 'l',
                            borderRadius: 's',
                            textAlign: 'center',
                        })}
                    >
                        <Text>LEAVE THE ROOM</Text>
                    </TouchableOpacity>
                </View>
            ),
        },
    ];
    const selectedTab = tabs.find(({ selected }) => selected === true);
    if (selectedTab === undefined) {
        throw new Error('Exactly one tab must be selected');
    }

    function handleTrackReady() {
        sendToMachine({
            type: 'TRACK_HAS_LOADED',
        });
    }

    function handlePlayPauseToggle() {
        sendToMachine('PLAY_PAUSE_TOGGLE');
    }

    function handleNextTrackPress() {
        sendToMachine('GO_TO_NEXT_TRACK');
    }

    return (
        <AppScreen>
            <AppModalHeader
                insetTop={insets.top}
                dismiss={() => {
                    dismissFullScreenPlayer();
                }}
                HeaderLeft={() => (
                    <View sx={{ flex: 1 }}>
                        <Typo numberOfLines={1} sx={{ fontSize: 'm' }}>
                            {context.name}
                        </Typo>

                        <Typo
                            sx={{
                                fontSize: 's',
                                color: 'greyLighter',
                                marginTop: 'xs',
                            }}
                        >
                            {context.usersLength} Listeners
                        </Typo>
                    </View>
                )}
            />

            <AppScreenContainer scrollable>
                <View
                    sx={{
                        // Reduce player width on bigger devices
                        width: ['auto', '70%'],
                        marginX: [0, 'auto'],
                        flex: 1,
                    }}
                >
                    <TheMusicPlayerWithControls
                        isDeviceEmitting={isDeviceEmitting()}
                        progressElapsedTime={context.progressElapsedTime}
                        currentTrack={context.currentTrack}
                        setPlayerRef={setPlayerRef}
                        isPlaying={isPlaying}
                        roomIsReady={roomIsReady}
                        onTrackReady={handleTrackReady}
                        onPlayingToggle={handlePlayPauseToggle}
                        onNextTrackPress={handleNextTrackPress}
                    />

                    <View
                        sx={{
                            marginTop: 'l',
                            flexGrow: 1,
                            // Shrink the view on mobile and let is expand on bigger devices
                            flexShrink: [1, 0],
                            marginBottom: insets.bottom,
                        }}
                    >
                        <View
                            sx={{
                                flexDirection: 'row',
                                padding: 'xs',

                                marginBottom: 'l',
                            }}
                        >
                            {tabs.map(({ text, selected, onPress }, index) => (
                                <TouchableOpacity
                                    onPress={onPress}
                                    key={text}
                                    style={{ flex: 1 }}
                                >
                                    <View
                                        sx={{
                                            padding: 's',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 's',

                                            backgroundColor: selected
                                                ? 'greyLighter'
                                                : 'greyLight',

                                            marginRight:
                                                index < tabs.length - 1
                                                    ? 'm'
                                                    : undefined,
                                        }}
                                    >
                                        <Text
                                            sx={{
                                                fontSize: 's',
                                                color: 'white',
                                            }}
                                        >
                                            {text}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <selectedTab.component />
                    </View>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default TheMusicPlayerFullScreen;
