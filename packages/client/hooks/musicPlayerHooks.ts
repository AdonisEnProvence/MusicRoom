import { MtvPlayingModes } from '@musicroom/types';
import { useCallback, useMemo } from 'react';
import { MusicPlayerContextValue, useAppContext } from '../contexts/AppContext';
import { AppMusicPlayerMachineContext } from '../machines/appMusicPlayerMachine';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';

export function useMusicPlayContext(): MusicPlayerContextValue {
    const { musicPlayerContext } = useAppContext();

    return musicPlayerContext;
}

interface UserGetIsDeviceEmittingArgs {
    musicPlayerMachineContext: AppMusicPlayerMachineContext;
    musicPlayerDoesNotHaveRoomIsReadyTag: boolean;
    currDeviceID: string | undefined;
}

/**
 * /!\ Should only be used inside the AppContext.tsx /!\
 * @returns
 */
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

export function useSuggestTracks(closeSuggestionModal: () => void): {
    suggestTracks: (tracksIDs: string[]) => void;
    showActivityIndicatorOnSuggestionsResultsScreen: boolean;
} {
    const { musicPlayerState, sendToMusicPlayerMachine } =
        useMusicPlayContext();

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
    const { musicPlayerState } = useMusicPlayContext();
    const actor: CreationMtvRoomFormActorRef =
        musicPlayerState.children.creationMtvRoomForm;

    return actor ?? undefined;
}
