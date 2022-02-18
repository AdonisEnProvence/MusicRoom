import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { AppScreen, AppScreenHeader } from '../../../components/kit';

const BlankScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
        <AppScreen>
            <AppScreenHeader
                title=""
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />
        </AppScreen>
    );
};

export default BlankScreen;
