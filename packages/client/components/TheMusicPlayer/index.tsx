import { useBackHandler } from '@react-native-community/hooks';
import { View } from 'dripsy';
import React from 'react';
import { useMusicPlayerContext } from '../../hooks/musicPlayerHooks';
import { useUserContext } from '../../hooks/userHooks';
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
    const {
        musicPlayerState,
        sendToMusicPlayerMachine,
        setPlayerRef,
        isDeviceEmitting,
    } = useMusicPlayerContext();
    const { userState, sendToUserMachine } = useUserContext();

    const userDoesNotHaveControlAndDelegationPermission = musicPlayerState
        .context.userRelatedInformation
        ? !musicPlayerState.context.userRelatedInformation
              .hasControlAndDelegationPermission
        : false;
    const hideControlButtons =
        musicPlayerState.context.userRelatedInformation === null ||
        userDoesNotHaveControlAndDelegationPermission;

    const isInRoom = musicPlayerState.context.roomID !== '';
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
                hideControlButtons={hideControlButtons}
                musicPlayerState={musicPlayerState}
                sendToMusicPlayerMachine={sendToMusicPlayerMachine}
                height={MINI_PLAYER_HEIGHT}
                onPress={openPlayerInFullScreen}
            />

            {isInRoom && (
                <View
                    testID="music-player-fullscreen-container"
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
                        hideControlButtons={hideControlButtons}
                        sendToUserMachine={sendToUserMachine}
                        userState={userState}
                        sendToMusicPlayerMachine={sendToMusicPlayerMachine}
                        isDeviceEmitting={isDeviceEmitting}
                        musicPlayerState={musicPlayerState}
                        setPlayerRef={setPlayerRef}
                    />
                </View>
            )}
        </View>
    );
};

export default TheMusicPlayer;
