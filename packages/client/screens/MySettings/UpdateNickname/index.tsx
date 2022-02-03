import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../../components/kit';
import { MySettingsUpdateNicknameScreenProps } from '../../../types';

const UpdateNicknameScreen: React.FC<MySettingsUpdateNicknameScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen>
            <AppScreenHeader
                title="Update nickname"
                insetTop={insets.top}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer />
        </AppScreen>
    );
};

export default UpdateNicknameScreen;
