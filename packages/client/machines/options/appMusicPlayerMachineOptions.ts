import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import {
    goBackFromRef,
    navigateFromRef,
} from '../../navigation/RootNavigation';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../appMusicPlayerMachine';

export interface GetMusicPlayerMachineOptionsArgs {
    setDisplayModal: (display: boolean) => void;
    fetchMusicPlayerElapsedTime: () => Promise<number>;
    setIsFullScreen: (isFullscreen: boolean) => void;
}

export type AppMusicPlayerMachineOptions = Partial<
    MachineOptions<AppMusicPlayerMachineContext, AppMusicPlayerMachineEvent>
>;

export function getMusicPlayerMachineOptions({
    setDisplayModal,
    fetchMusicPlayerElapsedTime,
    setIsFullScreen,
}: GetMusicPlayerMachineOptionsArgs): AppMusicPlayerMachineOptions {
    return {
        services: {
            listenForFocus: () => (sendBack) => {
                function listener() {
                    sendBack('FOCUS_READY');
                }

                //Can't be using always props in state machine as invoke is called before it
                if (Platform.OS !== 'web') {
                    listener();
                    return;
                }

                // `true` means body should receive `click` events before anyone else.
                // See capturing phase: https://javascript.info/bubbling-and-capturing.
                document.body.addEventListener('click', listener, true);
                setDisplayModal(true);

                return () => {
                    document.body.removeEventListener('click', listener);
                    setDisplayModal(false);
                };
            },

            pollTrackElapsedTime: () => (sendBack) => {
                const INTERVAL = 1000;
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                const timerId = setInterval(async () => {
                    try {
                        const elapsedTime = await fetchMusicPlayerElapsedTime();

                        sendBack({
                            type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME',
                            elapsedTime,
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }, INTERVAL);

                return () => {
                    clearInterval(timerId);
                };
            },
        },
        actions: {
            leaveRoomFromLeaveRoomButton: () => {
                setIsFullScreen(false);
            },

            displayAlertForcedDisconnectionToastAndMinimizeMusicPlayer: () => {
                Toast.show({
                    type: 'info',
                    text1: 'Creator leaved his Music Track Vote room',
                    text2: `You've been forced disconnected`,
                });
                setIsFullScreen(false);
            },

            goBackFromRef: () => {
                goBackFromRef();
            },

            expandMusicPlayerFullScreen: () => {
                setIsFullScreen(true);
            },

            showTracksSuggestionAcknowledgementToast: () => {
                Toast.show({
                    type: 'success',
                    text1: 'Track suggestion',
                    text2: 'Your suggestion has been accepted',
                });
            },

            showTracksSuggestionFailedToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'Track suggestion',
                    text2: 'Your suggestion has been rejected',
                });
            },

            openCreationMtvRoomFormModal: () => {
                navigateFromRef('MusicTrackVoteCreationForm', {
                    screen: 'MusicTrackVoteCreationFormName',
                });
            },

            closeCreationMtvRoomFormModal: ({ closeMtvRoomCreationModal }) => {
                closeMtvRoomCreationModal?.();
            },
        },
    };
}
