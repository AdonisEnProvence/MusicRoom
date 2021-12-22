import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import { navigateFromRef } from '../../navigation/RootNavigation';
import {
    MusicPlaylistsContext,
    MusicPlaylistsEvents,
} from '../appMusicPlaylistsMachine';

export type AppMusicPlaylistsOptions = Partial<
    MachineOptions<MusicPlaylistsContext, MusicPlaylistsEvents>
>;

export function getAppMusicPlaylistsMachineOptions(): Partial<AppMusicPlaylistsOptions> {
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

            closeCreationMpeFormModal: () => {
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
        },
    };
}
