import { View } from 'dripsy';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';
import YouTube, { Options } from 'react-youtube';
import { YouTubePlayer } from 'youtube-player/dist/types';
import { PlayerComponent, PlayerProps, PlayerRef } from './contract';

function getYoutubePlayerState(
    id: typeof YouTube.PlayerState[keyof typeof YouTube.PlayerState],
): keyof typeof YouTube.PlayerState {
    const matchingState = Object.entries(YouTube.PlayerState).find(
        ([, stateId]) => stateId === id,
    );
    if (matchingState === undefined) {
        throw new Error(`Could not find any match for the id: ${id}`);
    }

    return matchingState[0] as keyof typeof YouTube.PlayerState;
}

const WebPlayer: PlayerComponent = forwardRef<PlayerRef, PlayerProps>(
    ({ videoId, playing, onReady, seekToInSeconds, mute }, ref) => {
        const playerRef = useRef<YouTubePlayer>();

        useImperativeHandle(ref, () => ({
            getDuration() {
                const duration = playerRef.current?.getDuration();
                if (duration === undefined) {
                    throw new Error(
                        'Could not get duration from react-youtube',
                    );
                }

                return Promise.resolve(duration);
            },

            getCurrentTime() {
                const currentTime = playerRef.current?.getCurrentTime();
                if (currentTime === undefined) {
                    throw new Error(
                        'Could not get current time from react-native-youtube-iframe',
                    );
                }

                return Promise.resolve(currentTime);
            },
        }));

        function handlePlayerStateChange({
            data,
        }: {
            data: typeof YouTube.PlayerState[keyof typeof YouTube.PlayerState];
        }) {
            const playerState = getYoutubePlayerState(data);

            switch (playerState) {
                case 'CUED': {
                    onReady?.();
                }
            }
        }

        useEffect(() => {
            playerRef.current?.seekTo(seekToInSeconds, true);
            if (playing === true) {
                playerRef.current?.playVideo();
            } else {
                playerRef.current?.pauseVideo();
            }
            if (mute) {
                playerRef.current?.mute();
            } else if (
                mute === false &&
                playerRef.current &&
                playerRef.current.isMuted()
            ) {
                playerRef.current?.unMute();
            }
        }, [playing, playerRef, seekToInSeconds, mute]);

        const playerOptions: Options = {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                rel: 0,
            },
        };

        function setPlayerRef(ref: YouTube) {
            if (ref === null) {
                return;
            }

            playerRef.current = ref.getInternalPlayer();
        }

        return (
            <View
                sx={{
                    overflow: 'hidden',
                    paddingTop: '56.25%',
                    position: 'relative',
                }}
            >
                <YouTube
                    ref={setPlayerRef}
                    videoId={videoId}
                    opts={playerOptions}
                    onReady={() => {
                        onReady?.();
                    }}
                    onStateChange={handlePlayerStateChange}
                    containerStyle={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '100%',
                    }}
                />
            </View>
        );
    },
);

export default WebPlayer;
