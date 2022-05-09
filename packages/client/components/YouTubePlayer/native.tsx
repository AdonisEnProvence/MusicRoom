import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { PlayerComponent, PlayerProps, PlayerRef } from './contract';

const NativePlayer: PlayerComponent = forwardRef<PlayerRef, PlayerProps>(
    (
        { width, height, videoId, playing, onReady, seekToInSeconds, mute },
        ref,
    ) => {
        const playerRef = useRef<YoutubeIframeRef>(null);

        useEffect(() => {
            playerRef.current?.seekTo(seekToInSeconds, true);
        }, [playerRef, seekToInSeconds, playing]);

        useImperativeHandle(ref, () => ({
            async getDuration() {
                const duration = await playerRef.current?.getDuration();
                if (duration === undefined) {
                    throw new Error(
                        'Could not get duration from react-native-youtube-iframe',
                    );
                }

                return duration;
            },

            async getCurrentTime() {
                const currentTime = await playerRef.current?.getCurrentTime();
                if (currentTime === undefined) {
                    throw new Error(
                        'Could not get current time from react-native-youtube-iframe',
                    );
                }

                return currentTime;
            },
        }));

        return (
            <YoutubePlayer
                ref={playerRef}
                videoId={videoId}
                height={height}
                width={width}
                play={playing}
                mute={mute}
                //FIX for android see https://stackoverflow.com/questions/63171131/when-rendering-iframes-with-html-android-crashes-while-navigating-back-to-s
                webViewStyle={{ opacity: 0.99 }}
                webViewProps={{
                    androidHardwareAccelerationDisabled: true,
                }}
                onReady={onReady}
            />
        );
    },
);

export default NativePlayer;
