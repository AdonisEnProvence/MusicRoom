import { useBackHandler } from '@react-native-community/hooks';
import { useSx, View } from 'dripsy';
import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';
import { Typo } from '../kit';
import TheMusicPlayerFullScreen from './TheMusicPlayerFullScreen';
import TheMusicPlayerMini from './TheMusicPlayerMini';

type TheMusicPlayerProps = {
    isFullScreen: boolean;
    setIsFullScren: (isOpen: boolean) => void;
};

const TheMusicPlayer: React.FC<TheMusicPlayerProps> = ({
    isFullScreen,
    setIsFullScren,
}) => {
    const MINI_PLAYER_HEIGHT = 52;
    const sx = useSx();
    const { state, sendToMachine, setPlayerRef } = useMusicPlayer();
    const { currentTrack, name } = state.context;
    const isInRoom = state.context.roomID !== '';
    function openPlayerInFullScreen() {
        if (isInRoom === true) {
            setIsFullScren(true);
        }
    }

    useBackHandler(() => {
        if (isFullScreen) {
            setIsFullScren(false);
            return true;
        }

        return false;
    });

    return (
        <TouchableWithoutFeedback onPress={openPlayerInFullScreen}>
            <View
                style={sx({
                    backgroundColor: 'greyLight',
                    borderBottomColor: 'black',
                    borderBottomWidth: 1,
                    position: isFullScreen ? 'absolute' : 'relative',
                    top: isFullScreen ? -1 * MINI_PLAYER_HEIGHT : 0,
                    bottom: 0,
                    right: 0,
                    left: 0,
                    zIndex: 20,
                })}
            >
                <Typo>{JSON.stringify(state.value)}</Typo>
                <TheMusicPlayerMini
                    height={MINI_PLAYER_HEIGHT}
                    roomName={name}
                    currentTrackName={currentTrack?.title}
                    currentTrackArtist={currentTrack?.artistName}
                />

                {isInRoom && currentTrack !== undefined && (
                    <View
                        accessibilityState={{
                            expanded: isFullScreen === true,
                        }}
                        style={{
                            flex: 1,
                            transform: [{ translateY: isFullScreen ? 0 : 200 }],
                        }}
                    >
                        <TheMusicPlayerFullScreen
                            dismissFullScreenPlayer={() => {
                                setIsFullScren(false);
                            }}
                            sendToMachine={sendToMachine}
                            machineState={state}
                            setPlayerRef={setPlayerRef}
                        />
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

export default TheMusicPlayer;
