import { useNavigation } from '@react-navigation/native';
import { useMachine } from '@xstate/react';
import { Sender } from '@xstate/react/lib/types';
import { Text, View } from 'dripsy';
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { MusicPlayerRef } from './Player';
import SettingsTab from './Tabs/Settings';
import TracksListTab from './Tabs/TracksList';
import TheMusicPlayerWithControls from './TheMusicPlayerWithControls';

type TheMusicPlayerFullScreenProps = {
    musicPlayerState: AppMusicPlayerMachineState;
    dismissFullScreenPlayer: () => void;
    sendToMusicPlayerMachine: Sender<AppMusicPlayerMachineEvent>;
    sendToUserMachine: Sender<AppUserMachineEvent>;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    isDeviceEmitting: boolean;
    userState: AppUserMachineState;
    hideControlButtons: boolean;
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
            tracks: {},

            settings: {},
        },

        on: {
            GO_TO_TRACKS: {
                target: 'tracks',
            },

            GO_TO_SETTINGS: {
                target: 'settings',
            },
        },
    });

interface Tab {
    text: 'Tracks' | 'Chat' | 'Settings';
    selected: boolean;
    onPress: () => void;
}

const TheMusicPlayerFullScreen: React.FC<TheMusicPlayerFullScreenProps> = ({
    musicPlayerState,
    dismissFullScreenPlayer,
    sendToMusicPlayerMachine,
    sendToUserMachine,
    setPlayerRef,
    isDeviceEmitting,
    hideControlButtons,
    userState,
}) => {
    // TODO: replace the hook by a prop
    const navigation = useNavigation();
    const musicPlayerMachineContext = musicPlayerState.context;
    const userMachineContext = userState.context;

    const insets = useSafeAreaInsets();
    const isPlaying = musicPlayerState.hasTag('playerOnPlay');
    const roomIsReady = musicPlayerState.hasTag('playerIsReady');

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
        },
        {
            text: 'Settings',
            selected: tabsState.matches('settings'),
            onPress: () => {
                tabsSend({
                    type: 'GO_TO_SETTINGS',
                });
            },
        },
        {
            text: 'Chat',
            selected: false,
            onPress: () => {
                navigation.navigate('MusicTrackVoteChat');
            },
        },
    ];
    const selectedTab = tabs.find(({ selected }) => selected === true);
    if (selectedTab === undefined) {
        throw new Error('Exactly one tab must be selected');
    }

    const selectedTabComponent = useMemo(() => {
        switch (selectedTab.text) {
            case 'Tracks':
                return (
                    <TracksListTab
                        musicPlayerMachineContext={musicPlayerMachineContext}
                        sendToMusicPlayerMachine={sendToMusicPlayerMachine}
                    />
                );
            case 'Settings':
                return (
                    <SettingsTab
                        userMachineContext={userMachineContext}
                        sendToMusicPlayerMachine={sendToMusicPlayerMachine}
                        sendToUserMachine={sendToUserMachine}
                        musicPlayerMachineContext={musicPlayerMachineContext}
                    />
                );
            default:
                throw new Error('Reached unreachable state');
        }
    }, [
        musicPlayerMachineContext,
        selectedTab.text,
        sendToMusicPlayerMachine,
        sendToUserMachine,
        userMachineContext,
    ]);

    function handleListenersPress() {
        navigation.navigate('MusicTrackVoteUsersList');
    }

    function handleTrackReady() {
        sendToMusicPlayerMachine({
            type: 'TRACK_HAS_LOADED',
        });
    }

    function handlePlayPauseToggle() {
        sendToMusicPlayerMachine({ type: 'PLAY_PAUSE_TOGGLE' });
    }

    function handleNextTrackPress() {
        sendToMusicPlayerMachine({ type: 'GO_TO_NEXT_TRACK' });
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
                            {musicPlayerMachineContext.name}
                        </Typo>

                        <TouchableOpacity onPress={handleListenersPress}>
                            <Typo
                                sx={{
                                    fontSize: 's',
                                    color: 'greyLighter',
                                    marginTop: 'xs',
                                }}
                            >
                                {musicPlayerMachineContext.usersLength}{' '}
                                Listeners
                            </Typo>
                        </TouchableOpacity>
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
                        hideControlButtons={hideControlButtons}
                        isDeviceEmitting={isDeviceEmitting}
                        progressElapsedTime={
                            musicPlayerMachineContext.progressElapsedTime
                        }
                        currentTrack={musicPlayerMachineContext.currentTrack}
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

                        {selectedTabComponent}
                    </View>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default TheMusicPlayerFullScreen;
