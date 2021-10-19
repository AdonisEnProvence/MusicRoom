import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import { AppUserMachineContext, AppUserMachineEvent } from '../appUserMachine';

export type AppUserMachineOptions = Partial<
    MachineOptions<AppUserMachineContext, AppUserMachineEvent>
>;

export function getUserMachineOptions(): AppUserMachineOptions {
    return {
        services: {
            showMtvRoomInvitationToast: (context, event) => (sendBack) => {
                if (event.type !== 'RECEIVED_MTV_ROOM_INVITATION') {
                    return;
                }
                const { creatorName, roomName } = event.invitation;
                Toast.show({
                    type: 'info',
                    text1: `${creatorName} sent you an invitation !`,
                    text2: `TAP ON ME to join ${roomName} Music Track vote room`,
                    onPress: () => {
                        sendBack({
                            type: 'USER_ACCEPTED_MTV_ROOM_INVITATION',
                            invitation: event.invitation,
                        });
                    },
                });
            },
        },
    };
}
