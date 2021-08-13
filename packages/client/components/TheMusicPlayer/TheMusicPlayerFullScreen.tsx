import { Ionicons } from '@expo/vector-icons';
import { useMachine } from '@xstate/react';
import { Text, View } from 'dripsy';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { AppUserMachineState } from '../../machines/appUserMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import MusicPlayerFullScreenTracksListItem from './MusicPlayerFullScreenTracksListItem';
import { MusicPlayerRef } from './Player';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    machineState: AppMusicPlayerMachineState;
    dismissFullScreenPlayer: () => void;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    userState: AppUserMachineState;
};

const fullscreenPlayerTabsMachineModel = createModel(
    {},
    {
        events: {
            GO_TO_TRACKS: () => ({}),

            GO_TO_CHAT: () => ({}),
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
                },
            },

            chat: {
                on: {
                    GO_TO_TRACKS: {
                        target: 'tracks',
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

const AddSongButton: React.FC = () => {
    return (
        <TouchableOpacity>
            <View
                sx={{
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
                }}
            >
                <Ionicons
                    name="add"
                    size={32}
                    color="white"
                    style={{
                        // Necessary to center the icon visually
                        right: -1,
                    }}
                />
            </View>
        </TouchableOpacity>
    );
};

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    machineState,
    dismissFullScreenPlayer,
    sendToMachine,
    setPlayerRef,
    userState,
}) => {
    const context = machineState.context;
    const userContext = userState.context;
    const isDeviceEmitting =
        context.userRelatedInformation !== null &&
        userContext.currDeviceID ===
            context.userRelatedInformation.emittingDeviceID;
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
            component: () =>
                context.tracks !== null ? (
                    <View sx={{ flex: 1 }}>
                        <FlatList
                            data={context.tracks}
                            renderItem={({
                                item: { title, artistName },
                                index,
                            }) => (
                                <MusicPlayerFullScreenTracksListItem
                                    index={index + 1}
                                    title={title}
                                    artistName={artistName}
                                    score={51}
                                    minimumScore={50}
                                />
                            )}
                            keyExtractor={(_, index) => String(index)}
                            style={{ flex: 1 }}
                        />

                        <AddSongButton />
                    </View>
                ) : null,
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
                        Welcome to our great Chat
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
                            style={{ flex: 1 }}
                        />
                    )}
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
                        isDeviceEmitting={isDeviceEmitting}
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
