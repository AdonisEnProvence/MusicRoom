import { MtvPlayingModes } from '@musicroom/types';
import { useActor } from '@xstate/react';
import { Sender } from '@xstate/react/lib/types';
import { useCallback, useMemo } from 'react';
import { MusicPlayerContextValue, useAppContext } from '../contexts/AppContext';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../machines/appMusicPlayerMachine';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { useUserContext } from './userHooks';

export function useMusicPlayerContext(): MusicPlayerContextValue {
    const {
        musicPlayerContext: {
            appMusicPlayerMachineActorRef,
            toggleIsFullScreen,
            setIsFullScreen,
            isFullScreen,
            setPlayerRef,
        },
    } = useAppContext();

    if (appMusicPlayerMachineActorRef === undefined) {
        throw new Error('MusicPlayer machine has not been invoked yet');
    }

    const { userState } = useUserContext();

    const [musicPlayerState, sendToMusicPlayerMachine] = useActor(
        appMusicPlayerMachineActorRef,
    );

    //MusicPlayer specific hook
    const isDeviceEmitting = useGetIsDeviceEmitting({
        currDeviceID: userState.context.currDeviceID,
        musicPlayerMachineContext: musicPlayerState.context,
    });
    ///

    return {
        isDeviceEmitting,
        isFullScreen,
        musicPlayerState,
        sendToMusicPlayerMachine,
        setIsFullScreen,
        setPlayerRef,
        toggleIsFullScreen,
    };
}

export function useMusicPlayerSend(): Sender<AppMusicPlayerMachineEvent> {
    const {
        musicPlayerContext: { appMusicPlayerMachineActorRef },
    } = useAppContext();
    if (appMusicPlayerMachineActorRef === undefined) {
        throw new Error('MusicPlayer machine has not been invoked yet');
    }

    return appMusicPlayerMachineActorRef.send;
}

interface UserGetIsDeviceEmittingArgs {
    musicPlayerMachineContext: AppMusicPlayerMachineContext;
    currDeviceID: string | undefined;
}

/**
 * /!\ Should only be used inside the AppContext.tsx /!\
 * @returns
 */
export function useGetIsDeviceEmitting({
    currDeviceID,
    musicPlayerMachineContext,
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
            musicPlayerMachineContext,
            currDeviceID,
            isDeviceOwnerTheDelegationOwner,
        ],
    );
    return isDeviceEmitting;
}

export function useSuggestTracks(closeSuggestionModal: () => void): {
    suggestTracks: (tracksIDs: string[]) => void;
    showActivityIndicatorOnSuggestionsResultsScreen: boolean;
} {
    const { musicPlayerState, sendToMusicPlayerMachine } =
        useMusicPlayerContext();

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
    const { musicPlayerState } = useMusicPlayerContext();
    const actor: CreationMtvRoomFormActorRef =
        musicPlayerState.children.creationMtvRoomForm;

    return actor ?? undefined;
}
