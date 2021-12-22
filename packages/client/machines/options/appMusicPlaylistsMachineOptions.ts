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
            redirectToMpeRoomView: (context, event) => {
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
        },
    };
}
