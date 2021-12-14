import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import {
    PlaylistMachineContext,
    PlaylistMachineEvents,
} from '../playlistMachine';

export function getPlaylistMachineOptions(): Partial<
    MachineOptions<PlaylistMachineContext, PlaylistMachineEvents>
> {
    return {
        actions: {
            triggerSuccessfulAddingTrackToast: () => {
                Toast.show({
                    type: 'success',
                    text1: 'Track added successfully',
                });
            },

            triggerFailureAddingTrackToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'Track could not be added',
                });
            },

            triggerSuccessfulChangeTrackOrderToast: () => {
                Toast.show({
                    type: 'success',
                    text1: 'Track moved successfully',
                });
            },

            triggerFailureChangeTrackOrderToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'Track could not be moved',
                });
            },
        },
    };
}
