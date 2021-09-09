import { useMachine } from '@xstate/react';
import React, { useContext, useRef } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import {
    ContextFrom,
    EventFrom,
    Sender,
    StateFrom,
    StateMachine,
} from 'xstate';
import { createModel } from 'xstate/lib/model';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import {
    MusicPlayerFullScreenProps,
    useMusicPlayerToggleFullScreen,
} from '../hooks/musicPlayerToggle';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
    createAppMusicPlayerMachine,
} from '../machines/appMusicPlayerMachine';
import {
    createCreationMtvRoomFormMachine,
    CreationMtvRoomFormActorRef,
} from '../machines/creationMtvRoomForm';
import { navigateFromRef } from '../navigation/RootNavigation';
import { Socket } from '../services/websockets';

type MusicPlayerContextValue = {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    state: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;

    homeScreenMachineState: StateFrom<HomeScreenMachine>;
    homeScreenMachineSend: Sender<EventFrom<HomeScreenMachine>>;
} & MusicPlayerFullScreenProps;

const MusicPlayerContext = React.createContext<
    MusicPlayerContextValue | undefined
>(undefined);

type MusicPlayerContextProviderProps = {
    socket: Socket;
    setDisplayModal: (display: boolean) => void;
};

// TODO: See if we need to optimize the performances
export const MusicPlayerContextProvider: React.FC<MusicPlayerContextProviderProps> =
    ({ socket, setDisplayModal, children }) => {
        const playerRef = useRef<MusicPlayerRef | null>(null);
        const { isFullScreen, setIsFullScreen, toggleIsFullScreen } =
            useMusicPlayerToggleFullScreen(false);

        const appMusicPlayerMachine = createAppMusicPlayerMachine({ socket });
        const [state, send] = useMachine(appMusicPlayerMachine, {
            services: {
                listenForFocus: () => (sendBack) => {
                    const listener = () => {
                        console.log('SENDING FOCUS READY');
                        sendBack('FOCUS_READY');
                    };

                    //Can't be using always props in state machine as invoke is called before it
                    if (Platform.OS !== 'web') {
                        listener();
                        return;
                    }

                    document.addEventListener('click', listener);
                    setDisplayModal(true);

                    return () => {
                        console.log('___CLEANUP___');
                        document.removeEventListener('click', listener);
                        setDisplayModal(false);
                    };
                },

                pollTrackElapsedTime: () => (sendBack) => {
                    const INTERVAL = 1000;
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    const timerId = setInterval(async () => {
                        try {
                            const elapsedTime =
                                await fetchMusicPlayerElapsedTime();

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
                    navigateFromRef('HomeScreen');
                },

                displayAlertForcedDisconnection: () => {
                    setIsFullScreen(false);
                    navigateFromRef('HomeScreen');
                    navigateFromRef('Alert', {
                        reason: 'FORCED_DISCONNECTION',
                    });
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
                    navigateFromRef('MusicTrackVoteCreationForm');
                },

                closeCreationMtvRoomFormModal: ({
                    closeMtvRoomCreationModal,
                }) => {
                    closeMtvRoomCreationModal?.();
                },
            },
        });

        function setPlayerRef(ref: MusicPlayerRef) {
            playerRef.current = ref;

            send({
                type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET',
            });
        }

        async function fetchMusicPlayerElapsedTime(): Promise<number> {
            const player = playerRef.current;
            if (player === null) {
                throw new Error(
                    'playerRef is null, the reference has not been set correctly',
                );
            }

            const elapsedTime: number = await player.getCurrentTime();

            return elapsedTime * 1000;
        }

        const [homeScreenMachineState, homeScreenMachineSend] = useMachine(
            homeScreenMachine,
            {
                actions: {
                    openCreationMtvRoomFormModal: () => {
                        navigateFromRef('MusicTrackVoteCreationForm');
                    },

                    closeCreationMtvRoomFormModal: ({
                        closeMtvRoomCreationModal,
                    }) => {
                        console.log('in closeCreationMtvRoomFormModal action');

                        closeMtvRoomCreationModal?.();
                    },
                },
            },
        );

        return (
            <MusicPlayerContext.Provider
                value={{
                    sendToMachine: send,
                    state,
                    setPlayerRef,
                    isFullScreen,
                    setIsFullScreen,
                    toggleIsFullScreen,

                    homeScreenMachineState,
                    homeScreenMachineSend,
                }}
            >
                {children}
            </MusicPlayerContext.Provider>
        );
    };

export function useMusicPlayer(): MusicPlayerContextValue {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error(
            'useMusicPlayer must be used within a MusicPlayerContextProvider',
        );
    }

    return context;
}

export function useSuggestTracks(closeSuggestionModal: () => void): {
    suggestTracks: (tracksIDs: string[]) => void;
    showActivityIndicatorOnSuggestionsResultsScreen: boolean;
} {
    const { sendToMachine, state } = useMusicPlayer();

    function suggestTracks(tracksIDs: string[]) {
        sendToMachine({
            type: 'SUGGEST_TRACKS',
            tracksToSuggest: tracksIDs,
            closeSuggestionModal,
        });
    }

    const showActivityIndicatorOnSuggestionsResultsScreen = state.hasTag(
        'showActivityIndicatorOnSuggestionsResultsScreen',
    );

    return {
        suggestTracks,
        showActivityIndicatorOnSuggestionsResultsScreen,
    };
}

export function useCreationMtvRoomFormMachine():
    | CreationMtvRoomFormActorRef
    | undefined {
    const { homeScreenMachineState } = useMusicPlayer();
    const actor: CreationMtvRoomFormActorRef =
        homeScreenMachineState.children.creationMtvRoomForm;

    return actor ?? undefined;
}

const homeScreenModel = createModel(
    {
        closeMtvRoomCreationModal: (() => {
            return undefined;
        }) as (() => void) | undefined,
    },
    {
        events: {
            OPEN_SETTINGS: () => ({}),

            SAVE_MTV_ROOM_CREATION_MODAL_CLOSER: (closeModal: () => void) => ({
                closeModal,
            }),

            EXIT_MTV_ROOM_CREATION: () => ({}),
        },
    },
);

const homeScreenMachine = homeScreenModel.createMachine({
    initial: 'idle',

    states: {
        idle: {
            on: {
                OPEN_SETTINGS: {
                    target: 'selectingRoomOptions',
                },
            },
        },

        selectingRoomOptions: {
            entry: 'openCreationMtvRoomFormModal',

            exit: 'closeCreationMtvRoomFormModal',

            invoke: {
                id: 'creationMtvRoomForm',

                src: createCreationMtvRoomFormMachine(),

                onDone: {
                    target: 'idle',
                },
            },

            on: {
                SAVE_MTV_ROOM_CREATION_MODAL_CLOSER: {
                    actions: [
                        homeScreenModel.assign({
                            closeMtvRoomCreationModal: (_context, event) =>
                                event.closeModal,
                        }),
                        (_context, event) => {
                            console.log(
                                'save mtv room creation modal closer event',
                                event,
                            );
                        },
                    ],
                },

                EXIT_MTV_ROOM_CREATION: {
                    target: 'idle',
                },
            },
        },
    },
});

type HomeScreenMachine = StateMachine<
    ContextFrom<typeof homeScreenMachine>,
    any,
    EventFrom<typeof homeScreenMachine>
>;
