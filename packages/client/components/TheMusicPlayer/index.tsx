import { useBackHandler } from '@react-native-community/hooks';
import { View } from 'dripsy';
import React from 'react';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';
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
    const { state, sendToMachine, setPlayerRef } = useMusicPlayer();
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
        <View
            sx={{
                backgroundColor: 'greyLight',
                borderBottomColor: 'black',
                borderBottomWidth: 1,
                position: isFullScreen ? 'absolute' : 'relative',
                top: isFullScreen ? -1 * MINI_PLAYER_HEIGHT : 0,
                bottom: 0,
                right: 0,
                left: 0,
                zIndex: 20,
            }}
        >
            <TheMusicPlayerMini
                machineState={state}
                sendToMachine={sendToMachine}
                height={MINI_PLAYER_HEIGHT}
                onPress={openPlayerInFullScreen}
            />

            {isInRoom && (
                <View
                    accessibilityState={{
                        expanded: isFullScreen === true,
                    }}
                    style={{
                        flex: 1,
                        position: isFullScreen ? 'relative' : 'absolute',
                        bottom: isFullScreen ? undefined : '100%',
                        right: isFullScreen ? undefined : '100%',
                        width: '100%',
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
    );
};

export default TheMusicPlayer;
