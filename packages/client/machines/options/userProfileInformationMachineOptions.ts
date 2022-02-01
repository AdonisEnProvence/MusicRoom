import Toast from 'react-native-toast-message';
import { ProfileInformationMachineOptions } from '../profileInformationMachine';

export function getUserProfileInformationMachineOptions(): ProfileInformationMachineOptions {
    return {
        actions: {
            triggerFailurRetrieveProfileUserInformationToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'User not found',
                });
            },
        },
    };
}
