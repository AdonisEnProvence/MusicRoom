import React from 'react';
import { useRef } from 'react';
import { useImperativeHandle } from 'react';
import { useEffect } from 'react';
import { forwardRef } from 'react';
import YouTube, { Options } from 'react-youtube';
import { PlayerComponent, PlayerProps, PlayerRef } from './contract';
import { YoutubeIframePlayer } from './youtube-iframe';

const WebPlayer: PlayerComponent = forwardRef<PlayerRef, PlayerProps>(
    ({ width, height, videoId, playing, onReady }, ref) => {
        const playerRef = useRef<YoutubeIframePlayer>();

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

        useEffect(() => {
            if (playing === true) {
                playerRef.current?.playVideo();
            } else {
                playerRef.current?.pauseVideo();
            }
        }, [playing, playerRef]);

        const playerOptions: Options = {
            height: String(height),
            width: width !== undefined ? String(width) : '100%',
        };

        function setPlayerRef(ref: YouTube) {
            if (ref === null) {
                return;
            }

            playerRef.current = ref.getInternalPlayer() as YoutubeIframePlayer;
        }

        return (
            <YouTube
                ref={setPlayerRef}
                videoId={videoId}
                opts={playerOptions}
                onReady={() => {
                    onReady?.();
                }}
            />
        );
    },
);

export default WebPlayer;
