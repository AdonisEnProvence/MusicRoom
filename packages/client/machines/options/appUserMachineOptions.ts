import Toast from 'react-native-toast-message';
import { MachineOptions } from 'xstate';
import { AppUserMachineContext, AppUserMachineEvent } from '../appUserMachine';
import { assertEventType } from '../utils';

export type AppUserMachineOptions = Partial<
    MachineOptions<AppUserMachineContext, AppUserMachineEvent>
>;

export function getUserMachineOptions(): AppUserMachineOptions {
    return {
        services: {
            showMtvRoomInvitationToast: (_, event) => (sendBack) => {
                assertEventType(event, 'RECEIVED_MTV_ROOM_INVITATION');
                const { creatorName, roomName } = event.invitation;
                Toast.hide();
                Toast.show({
                    type: 'info',
                    visibilityTime: 10000,
                    text1: `${creatorName} sent you an invitation`,
                    text2: `TAP ON ME to join ${roomName} Music Track vote room`,
                    onPress: () => {
                        sendBack({
                            type: 'USER_ACCEPTED_MTV_ROOM_INVITATION',
                            invitation: event.invitation,
                        });
                    },
                    onHide: () => {
                        sendBack({
                            type: 'USER_IGNORED_MTV_ROOM_INVITATION',
                        });
                    },
                });

                return () => {
                    Toast.hide();
                };
            },
        },
    };
}
