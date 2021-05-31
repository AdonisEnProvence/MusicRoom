import { BottomTabBarOptions } from '@react-navigation/bottom-tabs';
import { StackNavigationOptions } from '@react-navigation/stack';
import { ColorSchemeName } from 'react-native';

interface Palette {
    primary: string;
    secondary: string;
    text: string;
    white: string;
    headerBackground: string;
}

const darkPalette: Palette = {
    primary: '#212121',
    secondary: '#1db954',
    text: '#fff',
    white: '#fff',
    headerBackground: '#121212',
};

const lightPalette: Palette = {
    primary: '#FF9533',
    secondary: '#000',
    text: '#000',
    white: '#fff',
    headerBackground: '#FE6D35',
};

const navigationPalette: {
    dark: StackNavigationOptions;
    light: StackNavigationOptions;
} = {
    light: {
        headerShown: true,
        headerStyle: {
            backgroundColor: lightPalette.headerBackground,
        },
        headerTintColor: lightPalette.white,
        headerTitleStyle: {
            fontWeight: 'bold',
        },
    },
    dark: {
        headerShown: true,
        headerStyle: {
            backgroundColor: darkPalette.headerBackground,
        },
        headerTintColor: darkPalette.white,
        headerTitleStyle: {
            fontWeight: 'bold',
        },
    },
};

const tabPalette: { dark: BottomTabBarOptions; light: BottomTabBarOptions } = {
    light: {
        activeBackgroundColor: lightPalette.secondary,
        inactiveBackgroundColor: lightPalette.headerBackground,
        activeTintColor: lightPalette.primary,
        inactiveTintColor: lightPalette.secondary,
        style: {
            borderTopColor: lightPalette.secondary,
        },
    },
    dark: {
        activeBackgroundColor: darkPalette.secondary,
        inactiveBackgroundColor: darkPalette.headerBackground,
        activeTintColor: darkPalette.primary,
        inactiveTintColor: darkPalette.secondary,
        style: {
            borderTopColor: darkPalette.secondary,
        },
    },
};

export const tabStyle = (scheme: ColorSchemeName): BottomTabBarOptions => {
    switch (scheme) {
        case 'dark':
            return tabPalette.dark;
        case 'light':
            return tabPalette.light;
        default:
            return tabPalette.dark;
    }
};

export const navigationStyle = (
    scheme: ColorSchemeName,
): StackNavigationOptions => {
    switch (scheme) {
        case 'dark':
            return navigationPalette.dark;
        case 'light':
            return navigationPalette.light;
        default:
            return navigationPalette.dark;
    }
};

export const colorPalette = (scheme: ColorSchemeName): Palette => {
    switch (scheme) {
        case 'dark':
            return darkPalette;
        case 'light':
            return lightPalette;
        default:
            return darkPalette;
    }
};
