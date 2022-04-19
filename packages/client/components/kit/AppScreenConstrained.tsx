import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'dripsy';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
    navigateFromRef,
    navigationRef,
} from '../../navigation/RootNavigation';
import { RootStackParamList } from '../../types';
import AppScreen, { AppScreenProps } from './AppScreen';

function getCurrentFocusedRoute() {
    const currentRoute = navigationRef.current?.getCurrentRoute();

    if (currentRoute === undefined) {
        return undefined;
    }

    const { name } = currentRoute;

    switch (name) {
        case 'HomeScreen': {
            return 'Home';
        }
        case 'SearchTracks': {
            return 'Search';
        }
        case 'MpeRooms': {
            return 'Library';
        }
        default: {
            return undefined;
        }
    }
}

const AppScreenConstrained: React.FC<AppScreenProps> = (props) => {
    const currentFocusedRoute = getCurrentFocusedRoute();

    const links: {
        icon: React.ComponentProps<typeof Ionicons>['name'];
        label: string;
        screen: RootStackParamList['Main'];
    }[] = [
        {
            icon: 'home',
            label: 'Home',
            screen: {
                screen: 'Root',
                params: {
                    screen: 'Home',
                    params: {
                        screen: 'HomeScreen',
                    },
                },
            },
        },
        {
            icon: 'search',
            label: 'Search',
            screen: {
                screen: 'Root',
                params: {
                    screen: 'Search',
                    params: {
                        screen: 'SearchTracks',
                    },
                },
            },
        },
        {
            icon: 'library',
            label: 'Library',
            screen: {
                screen: 'Root',
                params: {
                    screen: 'Library',
                    params: {
                        screen: 'MpeRooms',
                    },
                },
            },
        },
    ];

    return (
        <View
            sx={{
                flex: 1,
                flexDirection: 'row',
                backgroundColor: 'primary',
                justifyContent: 'center',
            }}
        >
            <View
                sx={{ flex: 1, flexDirection: 'row', maxWidth: ['100%', 860] }}
            >
                <View
                    testID="aside-menu"
                    sx={{
                        display: ['none', 'flex'],
                        padding: 'm',
                        marginLeft: 'l',
                        marginRight: 'l',
                    }}
                >
                    <ScrollView>
                        <View sx={{ marginBottom: 'xxl', padding: 'm' }}>
                            <Text sx={{ fontSize: 'l', color: 'white' }}>
                                Adonis
                            </Text>
                        </View>

                        {links.map(({ icon, label, screen }, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    navigateFromRef('Main', screen);
                                }}
                            >
                                <View
                                    sx={{
                                        marginBottom: 'xl',
                                        padding: 'm',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons
                                        name={icon}
                                        size={24}
                                        color="white"
                                    />

                                    <Text
                                        sx={{
                                            marginLeft: 'l',
                                            color: 'white',
                                            fontSize: 'm',
                                            fontWeight:
                                                currentFocusedRoute === label
                                                    ? 'bold'
                                                    : undefined,
                                        }}
                                    >
                                        {label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View
                    sx={{
                        flex: 1,
                    }}
                >
                    <AppScreen {...props} />
                </View>
            </View>
        </View>
    );
};

export default AppScreenConstrained;
