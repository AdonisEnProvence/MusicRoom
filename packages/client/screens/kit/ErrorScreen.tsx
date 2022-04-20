import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { Text, useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
    Typo,
} from '../../components/kit';

interface ErrorScreenProps {
    testID?: string;
    title: string;
    message: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
    testID,
    title,
    message,
}) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const sx = useSx();
    function handleGoBack() {
        navigation.goBack();
    }

    return (
        <AppScreen>
            <AppScreenHeader
                title={title}
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer testID={testID}>
                <View
                    sx={{
                        marginTop: 'xl',
                        alignSelf: 'center',
                    }}
                >
                    <Text
                        sx={{
                            color: 'white',
                            textAlign: 'center',
                            fontWeight: 'bold',
                        }}
                    >
                        {message}
                    </Text>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={sx({
                            paddingX: 's',
                            marginTop: 'l',
                            paddingY: 'm',
                            backgroundColor: 'greyLighter',
                            borderRadius: 's',
                        })}
                    >
                        <Text
                            sx={{
                                color: 'greyLight',
                                textAlign: 'center',
                                fontWeight: 'bold',
                            }}
                        >
                            Go back
                        </Text>
                    </TouchableOpacity>
                </View>
            </AppScreenContainer>
        </AppScreen>
    );
};

export default ErrorScreen;
