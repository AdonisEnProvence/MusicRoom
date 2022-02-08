import Toast from 'react-native-toast-message';
import { UserProfileInformationMachineOptions } from '../userProfileInformationMachine';

export function getUserProfileInformationMachineOptions(): UserProfileInformationMachineOptions {
    return {
        actions: {
            displayFailureRetrieveProfileUserErrorToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'User not found',
                });
            },

            displayFailureFollowOrUnfollowUserErrorToast: () => {
                Toast.show({
                    type: 'error',
                    text1: 'Operation failed, please try again later',
                });
            },
        },
    };
}
