import { MtvPlayingModes } from '@musicroom/types';
import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { MachineOptions, Sender, sendParent } from 'xstate';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import { MusicPlayerFullScreenProps } from '../hooks/musicPlayerToggle';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
} from '../machines/appMusicPlayerMachine';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { navigateFromRef } from '../navigation/RootNavigation';
import { useAppContext } from './AppContext';

export type MusicPlayerContextValue = {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    state: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    isDeviceEmitting: boolean;
} & MusicPlayerFullScreenProps;

const MusicPlayerContext = React.createContext<
    MusicPlayerContextValue | undefined
>(undefined);

type MusicPlayerContextProviderProps = {
    setDisplayModal: (display: boolean) => void;
};

interface UserGetIsDeviceEmittingArgs {
    musicPlayerMachineContext: AppMusicPlayerMachineContext;
    musicPlayerDoesNotHaveRoomIsReadyTag: boolean;
    currDeviceID: string | undefined;
}
export function useGetIsDeviceEmitting({
    currDeviceID,
    musicPlayerMachineContext,
    musicPlayerDoesNotHaveRoomIsReadyTag,
}: UserGetIsDeviceEmittingArgs): boolean {
    const isDeviceOwnerTheDelegationOwner = useCallback(
        function isDeviceOwnerTheDelegationOwner(): boolean {
            const roomIsNotInDirectMode =
                musicPlayerMachineContext.playingMode !==
                MtvPlayingModes.Values.DIRECT;

            if (roomIsNotInDirectMode) {
                return false;
            }

            if (musicPlayerMachineContext.userRelatedInformation === null) {
                return false;
            }

            const deviceOwnerIsNotTheDelegationOwner =
                musicPlayerMachineContext.delegationOwnerUserID === null ||
                musicPlayerMachineContext.delegationOwnerUserID !==
                    musicPlayerMachineContext.userRelatedInformation.userID;
            if (deviceOwnerIsNotTheDelegationOwner) {
                return false;
            }

            return true;
        },
        [musicPlayerMachineContext],
    );

    const isDeviceEmitting: boolean = useMemo(
        (): boolean => {
            if (musicPlayerDoesNotHaveRoomIsReadyTag) {
                return false;
            }

            if (musicPlayerMachineContext.userRelatedInformation === null) {
                return false;
            }

            const thisDeviceIsNotEmitting =
                currDeviceID !==
                musicPlayerMachineContext.userRelatedInformation
                    .emittingDeviceID;
            if (thisDeviceIsNotEmitting) {
                return false;
            }

            const roomIsInDirectMode =
                musicPlayerMachineContext.playingMode ===
                MtvPlayingModes.Values.DIRECT;
            if (roomIsInDirectMode) {
                return isDeviceOwnerTheDelegationOwner();
            }

            return true;
        },
        //Not optimal at all, function will be defined each time
        //Ok for semantic, we will se later for performances
        [
            musicPlayerDoesNotHaveRoomIsReadyTag,
            musicPlayerMachineContext,
            currDeviceID,
            isDeviceOwnerTheDelegationOwner,
        ],
    );
    return isDeviceEmitting;
}

export function getUserMachineOptions(
    setDisplayModal: (display: boolean) => void,
    fetchMusicPlayerElapsedTime: () => Promise<number>,
    setIsFullScreen: (isFullscreen: boolean) => void,
): MachineOptions<AppMusicPlayerMachineContext, AppMusicPlayerMachineEvent> {
    return {
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
            ifRoomHasPositionConstraintsAskForLocationPermission: (context) => {
                if (context.hasTimeAndPositionConstraints) {
                    sendParent({
                        type: 'REQUEST_LOCATION_PERMISSION',
                    });
                }
            },

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
                navigateFromRef('MusicTrackVoteCreationForm', {
                    screen: 'MusicTrackVoteCreationFormName',
                });
            },

            closeCreationMtvRoomFormModal: ({ closeMtvRoomCreationModal }) => {
                closeMtvRoomCreationModal?.();
            },
        },
        guards: {},
        activities: {},
        delays: {},
    };
}

export function useSuggestTracks(closeSuggestionModal: () => void): {
    suggestTracks: (tracksIDs: string[]) => void;
    showActivityIndicatorOnSuggestionsResultsScreen: boolean;
} {
    const {
        musicPlayerContext: { musicPlayerState, sendToMusicPlayerMachine },
    } = useAppContext();

    function suggestTracks(tracksIDs: string[]) {
        sendToMusicPlayerMachine({
            type: 'SUGGEST_TRACKS',
            tracksToSuggest: tracksIDs,
            closeSuggestionModal,
        });
    }

    const showActivityIndicatorOnSuggestionsResultsScreen =
        musicPlayerState.hasTag(
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
    const {
        musicPlayerContext: { musicPlayerState },
    } = useAppContext();
    const actor: CreationMtvRoomFormActorRef =
        musicPlayerState.children.creationMtvRoomForm;

    return actor ?? undefined;
}
