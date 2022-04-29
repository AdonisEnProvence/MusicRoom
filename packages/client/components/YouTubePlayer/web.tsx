import { View } from 'dripsy';
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';
import ReactPlayer from 'react-player';
import { PlayerComponent, PlayerProps, PlayerRef } from './contract';

const WebPlayer: PlayerComponent = forwardRef<PlayerRef, PlayerProps>(
    ({ videoId, playing, onReady, seekToInSeconds, mute }, ref) => {
        const playerRef = useRef<ReactPlayer | null>(null);

        useImperativeHandle(ref, () => ({
            getDuration() {
                const duration = playerRef.current?.getDuration();
                if (duration === undefined) {
                    throw new Error('Could not get duration from react-player');
                }

                return Promise.resolve(duration);
            },

            getCurrentTime() {
                const currentTime = playerRef.current?.getCurrentTime();
                if (currentTime === undefined) {
                    throw new Error(
                        'Could not get current time from react-player',
                    );
                }

                return Promise.resolve(currentTime);
            },
        }));

        useEffect(() => {
            playerRef.current?.seekTo(seekToInSeconds, 'seconds');
        }, [playerRef, seekToInSeconds]);

        const playerOptions = {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                rel: 0,
            },
        };

        return (
            <View
                sx={{
                    overflow: 'hidden',
                    paddingTop: '56.25%',
                    position: 'relative',
                }}
            >
                <ReactPlayer
                    ref={(player) => {
                        playerRef.current = player;
                    }}
                    url={`https://www.youtube.com/watch?v=${videoId}`}
                    playing={playing}
                    onReady={onReady}
                    muted={mute}
                    config={{ youtube: playerOptions }}
                    width="100%"
                    height="100%"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                    }}
                />
            </View>
        );
    },
);

export default WebPlayer;
