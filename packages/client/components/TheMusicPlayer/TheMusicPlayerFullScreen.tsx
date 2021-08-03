import { Text, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sender } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { useMachine } from '@xstate/react';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../../machines/appMusicPlayerMachine';
import { AppScreen, AppScreenContainer, Typo } from '../kit';
import AppModalHeader from '../kit/AppModalHeader';
import { MusicPlayerRef } from './Player';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    machineState: AppMusicPlayerMachineState;
    dismissFullScreenPlayer: () => void;
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    setPlayerRef: (ref: MusicPlayerRef) => void;
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
    component: () => React.ReactElement;
}

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    machineState,
    dismissFullScreenPlayer,
    sendToMachine,
    setPlayerRef,
}) => {
    const context = machineState.context;
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
                    <FlatList
                        data={[
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                            ...context.tracks,
                        ]}
                        renderItem={({ item: { title, artistName } }) => (
                            <View>
                                <Text sx={{ color: 'white' }}>
                                    {title} | {artistName}
                                </Text>
                            </View>
                        )}
                        keyExtractor={(_, index) => String(index)}
                        style={{ flex: 1 }}
                    />
                ) : (
                    <Text>Lol</Text>
                ),
        },
        {
            text: 'Chat',
            selected: tabsState.matches('chat'),
            onPress: () => {
                tabsSend({
                    type: 'GO_TO_CHAT',
                });
            },
            component: () => <Text sx={{ color: 'white' }}>Hello</Text>,
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
                            {context.users.length} Listeners
                        </Typo>
                    </View>
                )}
            />

            <AppScreenContainer>
                <TheMusicPlayerWithControls
                    currentTrack={context.currentTrack}
                    setPlayerRef={setPlayerRef}
                    isPlaying={isPlaying}
                    roomIsReady={roomIsReady}
                    onTrackReady={handleTrackReady}
                    onPlayingToggle={handlePlayPauseToggle}
                    onNextTrackPress={handleNextTrackPress}
                />

                <View sx={{ marginTop: 'l', flexGrow: 1, flexShrink: 0 }}>
                    <View
                        sx={{
                            flexDirection: 'row',
                            borderRadius: 's',
                            backgroundColor: 'greyLighter',
                            padding: 'xs',

                            marginBottom: 'l',
                        }}
                    >
                        {tabs.map(({ text, selected, onPress }) => (
                            <TouchableOpacity
                                onPress={onPress}
                                key={text}
                                style={{ flex: 1 }}
                            >
                                <View
                                    sx={{
                                        padding: 'xs',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 's',

                                        backgroundColor: selected
                                            ? 'white'
                                            : 'transparent',
                                    }}
                                >
                                    <Text sx={{ fontSize: 'm' }}>{text}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <selectedTab.component />
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default TheMusicPlayerFullScreen;
