import { Text, View } from 'dripsy';
import React from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../../../components/kit';
import { useUserContext } from '../../../hooks/userHooks';
import { MyDevicesScreenProps } from '../../../types';

const MyDevicesScreen: React.FC<MyDevicesScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { userState } = useUserContext();
    const devicesList = userState.context.devices;

    return (
        <AppScreen>
            <AppScreenHeader
                title="My Devices"
                insetTop={insets.top}
                canGoBack
                goBack={() => {
                    navigation.goBack();
                }}
            />

            <AppScreenContainer>
                <FlatList
                    data={devicesList}
                    renderItem={({ item: { name } }) => {
                        return (
                            <View
                                sx={{
                                    flex: 1,
                                    padding: 'm',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: 'greyLight',
                                    borderRadius: 's',
                                }}
                            >
                                <View
                                    sx={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        color: 'white',
                                    }}
                                >
                                    <Text
                                        sx={{
                                            color: 'white',
                                        }}
                                    >
                                        {name}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    keyExtractor={(item) => item.deviceID}
                    ItemSeparatorComponent={() => {
                        return <View sx={{ paddingY: 's' }} />;
                    }}
                    ListEmptyComponent={() => {
                        return (
                            <View>
                                <Text>Couldn't find any device</Text>
                            </View>
                        );
                    }}
                    contentContainerStyle={{
                        paddingBottom: insets.bottom,
                    }}
                    style={{
                        flex: 1,
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MyDevicesScreen;
