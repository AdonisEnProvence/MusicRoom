import { useState } from 'react';

export type MusicPlayerFullScreenProps = {
    isFullScreen: boolean;
    toggleIsFullScreen: () => boolean;
    setIsFullScreen: (isFullscreen: boolean) => void;
};

export function useMusicPlayerToggleFullScreen(
    defaultValue: boolean,
): MusicPlayerFullScreenProps {
    const [isFullScreen, setIsFullScreen] = useState<boolean>(defaultValue);

    const toggleIsFullScreen = () => {
        setIsFullScreen(!isFullScreen);
        return !isFullScreen;
    };

    return {
        isFullScreen,
        toggleIsFullScreen,
        setIsFullScreen,
    };
}
