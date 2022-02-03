import Toast from 'react-native-toast-message';
import { MyProfileInformationMachineOptions } from '../myProfileInformationMachine';

export function getMyProfileInformationMachineOptions(): MyProfileInformationMachineOptions {
    return {
        actions: {
            triggerFailureRetrieveMyProfileInformationToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'User not found',
                });
            },
        },
    };
}
