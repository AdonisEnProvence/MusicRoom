import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import {
    navigateFromRef,
    navigationRef,
} from '../../navigation/RootNavigation';
import {
    MusicPlaylistsContext,
    MusicPlaylistsEvents,
} from '../appMusicPlaylistsMachine';

export type AppMusicPlaylistsOptions = Partial<
    MachineOptions<MusicPlaylistsContext, MusicPlaylistsEvents>
>;

interface GetAppMusicPlaylistsMachineOptionsArgs {
    setIsFullScreen: (isFullscreen: boolean) => void;
}

export function getAppMusicPlaylistsMachineOptions({
    setIsFullScreen,
}: GetAppMusicPlaylistsMachineOptionsArgs): Partial<AppMusicPlaylistsOptions> {
    return {
        actions: {
            displayGetContextFailureToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: "Could't not load mpe room",
                });
            },
            navigateToMpeRoomsSearchScreen: () => {
                navigateFromRef('MusicPlaylistEditorRoomsSearch', {
                    screen: 'MusicPlaylistEditorRoomsSearchModal',
                });
            },
            displayLeaveSuccessToast: (context, event) => {
                if (event.type !== 'RECEIVED_MPE_LEAVE_ROOM_CALLBACK') {
                    return context;
                }

                Toast.show({
                    type: 'success',
                    text1: `Leaving ${event.roomSummary.roomName} is a success`,
                });
            },
            navigateToMpeRoomView: (context, event) => {
                if (event.type !== 'DISPLAY_MPE_ROOM_VIEW') {
                    return context;
                }

                navigateFromRef('Root', {
                    screen: 'Library',
                    params: {
                        screen: 'MpeRoom',
                        params: {
                            screen: 'Room',
                            params: {
                                id: event.roomID,
                            },
                        },
                    },
                });
            },
            openCreationMpeFormModal: () => {
                navigateFromRef('MusicPlaylistEditorCreationForm', {
                    screen: 'MusicTrackVoteCreationFormName',
                });
            },

            redirectToMpeLibrary: () => {
                navigateFromRef('Main', {
                    screen: 'Root',
                    params: {
                        screen: 'Library',
                        params: {
                            screen: 'MpeRooms',
                        },
                    },
                });
            },
            displayMpeForcedDisconnectionToast: (context, event) => {
                if (event.type !== 'RECEIVED_FORCED_DISCONNECTION') {
                    return context;
                }

                Toast.show({
                    type: 'error',
                    text1: `${event.roomSummary.roomName} creator has quit`,
                    text2: `forced disconnection`,
                });
            },
            goBackToLastScreen: () => {
                navigationRef.current?.goBack();
            },
            openMusicPlayerFullScreen: () => {
                setIsFullScreen(true);
            },
        },
    };
}
