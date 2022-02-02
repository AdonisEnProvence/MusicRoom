import Toast from 'react-native-toast-message';
import { UserProfileInformationMachineOptions } from '../userProfileInformationMachine';

export function getUserProfileInformationMachineOptions(): UserProfileInformationMachineOptions {
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
